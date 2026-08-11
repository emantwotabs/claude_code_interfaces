import * as React from 'react';
import {
    initializeBlock,
    useRecords,
    useCustomProperties,
} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import type {Base} from '@airtable/blocks/interface/models';
import type {Table} from '@airtable/blocks/interface/models';
import type {Field, FieldConfig} from '@airtable/blocks/interface/models';
import {spacing, typography} from '@claude-code-interfaces/tokens';
import {getFieldMeta} from '@claude-code-interfaces/helpers';
import './style.css';

const DATE_TYPES = new Set<FieldType>([FieldType.DATE, FieldType.DATE_TIME]);

const MEASURABLE_TYPES = new Set<FieldType>([
    FieldType.NUMBER,
    FieldType.CURRENCY,
    FieldType.PERCENT,
    FieldType.RATING,
    FieldType.DURATION,
]);

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCustomProperties(base: Base) {
    const table = base.tables[0];
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: table},
        {
            key: 'dateField',
            label: 'Date Field',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: {id: string; config: FieldConfig}) => DATE_TYPES.has(field.config.type),
        },
        {
            key: 'measureField',
            label: 'Sum Field (optional, else counts records)',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: {id: string; config: FieldConfig}) => MEASURABLE_TYPES.has(field.config.type),
        },
        {key: 'weeks', label: 'Weeks to show (4–53)', type: 'string' as const, defaultValue: '18'},
    ];
}

function toDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function Heatmap() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const dateFieldProp = customPropertyValueByKey.dateField as Field | null | undefined;
    const measureFieldProp = customPropertyValueByKey.measureField as Field | null | undefined;
    const weeksRaw = customPropertyValueByKey.weeks as string | undefined;

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }

    const dateMeta = getFieldMeta(table, dateFieldProp?.id ?? '');
    const dateField = dateFieldProp && DATE_TYPES.has(dateMeta.type as FieldType) ? dateFieldProp : null;

    if (!dateField) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose a Date Field on {table.name}.
            </div>
        );
    }

    const measureMeta = getFieldMeta(table, measureFieldProp?.id ?? '');
    const measureField =
        measureFieldProp && MEASURABLE_TYPES.has(measureMeta.type as FieldType) ? measureFieldProp : null;

    const weeks = Math.min(53, Math.max(4, parseInt(weeksRaw ?? '', 10) || 18));

    return <HeatmapForTable table={table} dateField={dateField} measureField={measureField} weeks={weeks} />;
}

function HeatmapForTable({
    table,
    dateField,
    measureField,
    weeks,
}: {
    table: Table;
    dateField: Field;
    measureField: Field | null;
    weeks: number;
}) {
    const records = useRecords(table);

    const totalsByDay = React.useMemo(() => {
        const totals = new Map<string, number>();
        for (const record of records) {
            const raw = record.getCellValue(dateField.id) as string | null;
            if (!raw) continue;
            const date = new Date(raw);
            if (Number.isNaN(date.getTime())) continue;
            date.setHours(0, 0, 0, 0);
            const key = toDayKey(date);
            const amount = measureField ? Number(record.getCellValue(measureField.id)) || 0 : 1;
            totals.set(key, (totals.get(key) ?? 0) + amount);
        }
        return totals;
    }, [records, dateField, measureField]);

    const {columns, maxValue} = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysBack = weeks * 7 - 1;
        const rawStart = new Date(today);
        rawStart.setDate(rawStart.getDate() - daysBack);
        const start = new Date(rawStart);
        start.setDate(start.getDate() - start.getDay()); // rewind to the preceding Sunday

        let max = 0;
        const cols: Array<{monthLabel: string | null; cells: Array<{key: string; value: number; inRange: boolean}>}> =
            [];
        let lastMonth = -1;

        for (let c = 0; c < weeks; c++) {
            const cellsForColumn: Array<{key: string; value: number; inRange: boolean}> = [];
            let monthLabel: string | null = null;
            for (let r = 0; r < 7; r++) {
                const date = new Date(start);
                date.setDate(date.getDate() + c * 7 + r);
                const inRange = date <= today;
                const key = toDayKey(date);
                const value = inRange ? totalsByDay.get(key) ?? 0 : 0;
                if (inRange) max = Math.max(max, value);
                cellsForColumn.push({key, value, inRange});
                if (inRange && date.getMonth() !== lastMonth && date.getDate() <= 7) {
                    monthLabel = MONTH_NAMES[date.getMonth()];
                    lastMonth = date.getMonth();
                }
            }
            cols.push({monthLabel, cells: cellsForColumn});
        }
        return {columns: cols, maxValue: max};
    }, [totalsByDay, weeks]);

    const levelFor = (value: number): number => {
        if (value <= 0 || maxValue <= 0) return 0;
        const ratio = value / maxValue;
        if (ratio > 0.75) return 4;
        if (ratio > 0.5) return 3;
        if (ratio > 0.25) return 2;
        return 1;
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                overflow: 'auto',
                padding: spacing[4],
                boxSizing: 'border-box',
                fontFamily: typography.fontFamily,
            }}
        >
            <div className="heat-wrap">
                <div className="heat-months">
                    <div className="heat-months-spacer" />
                    {columns.map((col, i) => (
                        <div key={i} className="heat-month-cell">
                            {col.monthLabel ?? ''}
                        </div>
                    ))}
                </div>
                <div className="heat-body">
                    <div className="heat-daylabels">
                        {DAY_LABELS.map((label, i) => (
                            <div key={i} className="heat-daylabel">
                                {label}
                            </div>
                        ))}
                    </div>
                    <div className="heat-columns">
                        {columns.map((col, ci) => (
                            <div key={ci} className="heat-column">
                                {col.cells.map((cell, ri) => (
                                    <div
                                        key={ri}
                                        className={
                                            cell.inRange ? `heat-cell heat-level-${levelFor(cell.value)}` : 'heat-cell heat-cell-future'
                                        }
                                        title={cell.inRange ? `${cell.key} — ${cell.value.toLocaleString()}` : undefined}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="heat-legend">
                    <span>Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div key={level} className={`heat-cell heat-level-${level}`} />
                    ))}
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}

initializeBlock({interface: () => <Heatmap />});
