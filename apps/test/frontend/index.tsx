import * as React from 'react';
import {
    initializeBlock,
    useRecords,
    useCustomProperties,
} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import type {Base} from '@airtable/blocks/interface/models';
import type {Table} from '@airtable/blocks/interface/models';
import type {Field} from '@airtable/blocks/interface/models';
import type {Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {airtableColorFamily, airtableColors, radii, spacing, typography} from '@claude-code-interfaces/tokens';
import {DebugPanel} from '@claude-code-interfaces/primitives';
import './style.css';

const SELECT_TYPES = new Set<FieldType>([FieldType.SINGLE_SELECT, FieldType.MULTIPLE_SELECTS]);

const GROUPABLE_TYPES = new Set<FieldType>([
    FieldType.SINGLE_SELECT,
    FieldType.MULTIPLE_SELECTS,
    FieldType.SINGLE_LINE_TEXT,
    FieldType.SINGLE_COLLABORATOR,
    FieldType.MULTIPLE_RECORD_LINKS,
    FieldType.CHECKBOX,
]);

const MEASURABLE_TYPES = new Set<FieldType>([
    FieldType.NUMBER,
    FieldType.CURRENCY,
    FieldType.PERCENT,
    FieldType.RATING,
    FieldType.DURATION,
]);

function getCustomProperties(base: Base) {
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: base.tables[0]},
        // Prompted at creation/setup time via the properties panel. Not used for any
        // API calls yet — this just wires the intake step so future visuals built from
        // this template can read customPropertyValueByKey.pat without re-plumbing it.
        {key: 'pat', label: 'Airtable Personal Access Token', type: 'string' as const, defaultValue: ''},
    ];
}

function labelForGroup(record: AirtableRecord, field: Field): string {
    if (field.type === FieldType.MULTIPLE_RECORD_LINKS) {
        const links = record.getCellValue(field.id) as Array<{name: string}> | null;
        return links && links.length > 0 ? links.map((l) => l.name).join(', ') : '(none)';
    }
    if (field.type === FieldType.MULTIPLE_SELECTS) {
        const values = record.getCellValue(field.id) as Array<{name: string}> | null;
        return values && values.length > 0 ? values.map((v) => v.name).join(', ') : '(none)';
    }
    if (field.type === FieldType.CHECKBOX) {
        return record.getCellValue(field.id) ? 'Checked' : 'Unchecked';
    }
    return record.getCellValueAsString(field.id) || '(empty)';
}

function BarChart() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const pat = customPropertyValueByKey.pat as string | undefined; // wired, unused for now

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }

    return <BarChartForTable table={table} pat={pat} />;
}

function BarChartForTable({table, pat: _pat}: {table: Table; pat?: string}) {
    // _pat: captured by the properties-panel intake step above, not yet consumed.
    // Visuals copied from this template that need to call api.airtable.com directly
    // can read it here instead of adding their own custom property.
    const records = useRecords(table);

    const groupableFields = React.useMemo<Field[]>(
        () => table.fields.filter((field) => GROUPABLE_TYPES.has(field.type)),
        [table],
    );
    const measurableFields = React.useMemo<Field[]>(
        () => table.fields.filter((field) => MEASURABLE_TYPES.has(field.type)),
        [table],
    );

    const [xFieldId, setXFieldId] = React.useState('');
    const [yFieldId, setYFieldId] = React.useState(''); // '' means Count of records

    React.useEffect(() => {
        if ((!xFieldId || !groupableFields.some((f) => f.id === xFieldId)) && groupableFields.length > 0) {
            setXFieldId(groupableFields[0].id);
        }
    }, [groupableFields, xFieldId]);

    const xField = groupableFields.find((f) => f.id === xFieldId) ?? null;
    const yField = measurableFields.find((f) => f.id === yFieldId) ?? null;

    const chartData = React.useMemo(() => {
        if (!xField) return [];
        const totals = new Map<string, number>();
        for (const record of records) {
            const label = labelForGroup(record, xField);
            const amount = yField ? Number(record.getCellValue(yField.id)) || 0 : 1;
            totals.set(label, (totals.get(label) ?? 0) + amount);
        }
        return Array.from(totals.entries())
            .map(([label, value]) => ({label, value}))
            .sort((a, b) => b.value - a.value);
    }, [records, xField, yField]);

    const maxValue = Math.max(...chartData.map((d) => d.value), 1);

    if (!xField) {
        return <div style={{padding: spacing[4]}}>This table has no fields usable for the X axis.</div>;
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
            <div className="chart-toolbar" style={{marginBottom: spacing[6]}}>
                <label className="chart-field">
                    <span className="chart-field-label">X axis</span>
                    <select className="chart-select" value={xFieldId} onChange={(e) => setXFieldId(e.target.value)}>
                        {groupableFields.map((field) => (
                            <option key={field.id} value={field.id}>
                                {field.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="chart-field">
                    <span className="chart-field-label">Y axis</span>
                    <select className="chart-select" value={yFieldId} onChange={(e) => setYFieldId(e.target.value)}>
                        <option value="">Count of records</option>
                        {measurableFields.map((field) => (
                            <option key={field.id} value={field.id}>
                                Sum of {field.name}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: spacing[3]}}>
                {chartData.map((d) => (
                    <div key={d.label} style={{display: 'flex', alignItems: 'center', gap: spacing[3]}}>
                        <div
                            style={{
                                width: 140,
                                flexShrink: 0,
                                fontSize: typography.fontSize.sm,
                                textAlign: 'right',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={d.label}
                        >
                            {d.label}
                        </div>
                        <div style={{flex: 1, background: airtableColors.gray.light2, borderRadius: radii.sm}}>
                            <div
                                style={{
                                    width: `${(d.value / maxValue) * 100}%`,
                                    minWidth: 2,
                                    background: airtableColors.blue.base,
                                    color: '#fff',
                                    borderRadius: radii.sm,
                                    padding: `${spacing[1]} ${spacing[2]}`,
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.bold,
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {d.value}
                            </div>
                        </div>
                    </div>
                ))}
                {chartData.length === 0 && (
                    <div style={{fontSize: typography.fontSize.sm, color: airtableColors.gray.dark1}}>No records to chart.</div>
                )}
            </div>
            {SELECT_TYPES.has(xField.type) && <ColorAudit field={xField} />}
        </div>
    );
}

/**
 * Ad-hoc verification, not a permanent feature: reads the real `color` string
 * Airtable assigns to each choice of a select field and checks it against
 * airtableColorFamily() — confirming the "10 hue families, no custom colors"
 * claim in the repo's /constraints guide against live data instead of docs.
 */
function ColorAudit({field}: {field: Field}) {
    const choices =
        (field.options as {choices?: Array<{id: string; name: string; color?: string}>} | null)?.choices ?? [];

    if (choices.length === 0) return null;

    return (
        <div style={{marginTop: spacing[8]}}>
            <div
                style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: airtableColors.gray.dark1,
                    marginBottom: spacing[3],
                }}
            >
                Color palette check — {field.name}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: spacing[2], marginBottom: spacing[3]}}>
                {choices.map((choice) => {
                    const family = airtableColorFamily(choice.color);
                    return (
                        <div key={choice.id} style={{display: 'flex', alignItems: 'center', gap: spacing[3]}}>
                            <span style={{width: 140, fontSize: typography.fontSize.sm, flexShrink: 0}}>{choice.name}</span>
                            <code style={{fontSize: typography.fontSize.xs, color: airtableColors.gray.dark1, width: 140}}>
                                {choice.color ?? '(none)'}
                            </code>
                            <span style={{fontSize: typography.fontSize.sm}}>→</span>
                            <span style={{fontSize: typography.fontSize.sm, width: 70}}>{family}</span>
                            <span
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: radii.sm,
                                    background: airtableColors[family].base,
                                    flexShrink: 0,
                                }}
                                title={`airtableColors.${family}.base`}
                            />
                        </div>
                    );
                })}
            </div>
            <DebugPanel label="Raw field.options (from the live base)" data={field.options} />
        </div>
    );
}

initializeBlock({interface: () => <BarChart />});
