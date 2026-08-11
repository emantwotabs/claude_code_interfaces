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

const MEASURABLE_TYPES = new Set<FieldType>([
    FieldType.NUMBER,
    FieldType.CURRENCY,
    FieldType.PERCENT,
    FieldType.RATING,
    FieldType.DURATION,
]);

const SLOT_COUNT = 3;

function getCustomProperties(base: Base) {
    // Each metric gets its own Table property; the sibling Field property has to be
    // scoped to *a* concrete table at schema-definition time (custom properties can't
    // read each other's chosen values yet), so it defaults to the Nth base table and
    // MetricTile re-validates the field against whichever table actually ends up
    // selected for that slot before trusting it.
    const isMeasurable = (field: {id: string; config: FieldConfig}) => MEASURABLE_TYPES.has(field.config.type);
    const table1 = base.tables[0];
    const table2 = base.tables[1] ?? base.tables[0];
    const table3 = base.tables[2] ?? base.tables[0];
    return [
        {key: 'metric1Table', label: 'Metric 1 — Table', type: 'table' as const, defaultValue: table1},
        {
            key: 'metric1Field',
            label: 'Metric 1 — Sum Field (optional, else counts records)',
            type: 'field' as const,
            table: table1,
            shouldFieldBeAllowed: isMeasurable,
        },
        {key: 'metric1Label', label: 'Metric 1 — Label override', type: 'string' as const, defaultValue: ''},
        {key: 'metric2Table', label: 'Metric 2 — Table', type: 'table' as const},
        {
            key: 'metric2Field',
            label: 'Metric 2 — Sum Field (optional, else counts records)',
            type: 'field' as const,
            table: table2,
            shouldFieldBeAllowed: isMeasurable,
        },
        {key: 'metric2Label', label: 'Metric 2 — Label override', type: 'string' as const, defaultValue: ''},
        {key: 'metric3Table', label: 'Metric 3 — Table', type: 'table' as const},
        {
            key: 'metric3Field',
            label: 'Metric 3 — Sum Field (optional, else counts records)',
            type: 'field' as const,
            table: table3,
            shouldFieldBeAllowed: isMeasurable,
        },
        {key: 'metric3Label', label: 'Metric 3 — Label override', type: 'string' as const, defaultValue: ''},
    ];
}

interface Slot {
    table: Table;
    field: Field | null | undefined;
    label: string | undefined;
}

function KpiStrip() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);

    const slots: Slot[] = [];
    for (let n = 1; n <= SLOT_COUNT; n++) {
        const table = customPropertyValueByKey[`metric${n}Table`] as Table | null | undefined;
        if (!table) continue;
        slots.push({
            table,
            field: customPropertyValueByKey[`metric${n}Field`] as Field | null | undefined,
            label: customPropertyValueByKey[`metric${n}Label`] as string | undefined,
        });
    }

    if (slots.length === 0) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose a Table for at least one metric.
            </div>
        );
    }

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
            <div className="kpi-strip">
                {slots.map((slot, i) => (
                    <MetricTile key={i} table={slot.table} field={slot.field} label={slot.label} />
                ))}
            </div>
        </div>
    );
}

function MetricTile({table, field, label}: {table: Table; field: Field | null | undefined; label: string | undefined}) {
    const records = useRecords(table);

    const meta = field ? getFieldMeta(table, field.id) : null;
    const validField = field && meta && MEASURABLE_TYPES.has(meta.type as FieldType) ? field : null;

    const value = React.useMemo(() => {
        if (!validField) return records.length;
        return records.reduce((sum, record) => sum + (Number(record.getCellValue(validField.id)) || 0), 0);
    }, [records, validField]);

    const displayLabel = label || (validField ? `Sum of ${validField.name}` : 'Count of records');

    return (
        <div className="kpi-tile">
            <div className="kpi-tile-value">{value.toLocaleString()}</div>
            <div className="kpi-tile-label">{displayLabel}</div>
            <div className="kpi-tile-source">{table.name}</div>
        </div>
    );
}

initializeBlock({interface: () => <KpiStrip />});
