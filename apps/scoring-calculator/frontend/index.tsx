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
import {airtableColors, spacing, typography} from '@claude-code-interfaces/tokens';
import {Badge} from '@claude-code-interfaces/primitives';
import {getFieldMeta} from '@claude-code-interfaces/helpers';
import './style.css';

const MEASURABLE_TYPES = new Set<FieldType>([
    FieldType.NUMBER,
    FieldType.CURRENCY,
    FieldType.PERCENT,
    FieldType.RATING,
    FieldType.DURATION,
]);

const DEFAULT_WEIGHT = 50;

function getCustomProperties(base: Base) {
    // Field-type custom properties need a concrete `table` at schema-definition
    // time, so this assumes base.tables[0] like the other templates in this repo.
    // ScoringForTable re-validates every factor field against whichever table is
    // actually selected before trusting it.
    const table = base.tables[0];
    const isMeasurable = (field: {id: string; config: FieldConfig}) => MEASURABLE_TYPES.has(field.config.type);
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: table},
        {key: 'factor1', label: 'Factor 1', type: 'field' as const, table, shouldFieldBeAllowed: isMeasurable},
        {key: 'factor2', label: 'Factor 2', type: 'field' as const, table, shouldFieldBeAllowed: isMeasurable},
        {key: 'factor3', label: 'Factor 3', type: 'field' as const, table, shouldFieldBeAllowed: isMeasurable},
    ];
}

function ScoringCalculator() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const factor1 = customPropertyValueByKey.factor1 as Field | null | undefined;
    const factor2 = customPropertyValueByKey.factor2 as Field | null | undefined;
    const factor3 = customPropertyValueByKey.factor3 as Field | null | undefined;

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }

    const chosen = [factor1, factor2, factor3].filter((f): f is Field => Boolean(f));
    const factorFields = chosen.filter((field) => {
        const meta = getFieldMeta(table, field.id);
        return MEASURABLE_TYPES.has(meta.type as FieldType);
    });

    if (factorFields.length === 0) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose at least one Factor — a number, currency, percent, rating, or
                duration field on {table.name}.
            </div>
        );
    }

    return <ScoringForTable table={table} factorFields={factorFields} />;
}

function ScoringForTable({table, factorFields}: {table: Table; factorFields: Field[]}) {
    const records = useRecords(table);
    const primaryFieldName = table.fields.find((field) => field.isPrimaryField)?.name ?? 'Record';

    const [weights, setWeights] = React.useState<Record<string, number>>(() =>
        Object.fromEntries(factorFields.map((field) => [field.id, DEFAULT_WEIGHT])),
    );

    // A field added after mount (or removed) should still get a slider / not leave a stale one.
    React.useEffect(() => {
        setWeights((prev) => {
            const next: Record<string, number> = {};
            for (const field of factorFields) {
                next[field.id] = prev[field.id] ?? DEFAULT_WEIGHT;
            }
            return next;
        });
    }, [factorFields]);

    const ranked = React.useMemo(() => {
        const rawByRecord = new Map<string, Record<string, number>>();
        for (const record of records) {
            const values: Record<string, number> = {};
            for (const field of factorFields) {
                values[field.id] = Number(record.getCellValue(field.id)) || 0;
            }
            rawByRecord.set(record.id, values);
        }

        // Min-max normalize each factor to 0-100 so a currency field and a 5-star
        // rating field can be weighted against each other on the same scale.
        const ranges = new Map<string, {min: number; max: number}>();
        for (const field of factorFields) {
            const values = records.map((record) => rawByRecord.get(record.id)?.[field.id] ?? 0);
            ranges.set(field.id, {min: Math.min(...values, 0), max: Math.max(...values, 0)});
        }

        const totalWeight = factorFields.reduce((sum, field) => sum + (weights[field.id] ?? 0), 0) || 1;

        return records
            .map((record) => {
                const values = rawByRecord.get(record.id) ?? {};
                let score = 0;
                for (const field of factorFields) {
                    const {min, max} = ranges.get(field.id) ?? {min: 0, max: 0};
                    const normalized = max > min ? ((values[field.id] - min) / (max - min)) * 100 : 50;
                    score += normalized * ((weights[field.id] ?? 0) / totalWeight);
                }
                return {record, values, score};
            })
            .sort((a, b) => b.score - a.score);
    }, [records, factorFields, weights]);

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
            <div className="score-weights" style={{marginBottom: spacing[6]}}>
                {factorFields.map((field) => (
                    <label key={field.id} className="score-weight">
                        <span className="score-weight-label">
                            {field.name}
                            <span className="score-weight-value">{weights[field.id] ?? DEFAULT_WEIGHT}</span>
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={weights[field.id] ?? DEFAULT_WEIGHT}
                            onChange={(e) =>
                                setWeights((prev) => ({...prev, [field.id]: Number(e.target.value)}))
                            }
                        />
                    </label>
                ))}
            </div>

            <div className="score-list">
                <div className="score-row score-row-head">
                    <span>#</span>
                    <span>{primaryFieldName}</span>
                    <span className="score-factors">
                        {factorFields.map((field) => (
                            <span key={field.id} title={field.name}>
                                {field.name}
                            </span>
                        ))}
                    </span>
                    <span>Score</span>
                </div>
                {ranked.map(({record, values, score}, index) => (
                    <div key={record.id} className="score-row">
                        <span className="score-rank">{index + 1}</span>
                        <span className="score-name">{record.name || '(unnamed)'}</span>
                        <span className="score-factors">
                            {factorFields.map((field) => (
                                <span key={field.id} title={field.name}>
                                    {values[field.id]?.toLocaleString() ?? 0}
                                </span>
                            ))}
                        </span>
                        <span>
                            <Badge tone={score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'gray'}>
                                {Math.round(score)}
                            </Badge>
                        </span>
                    </div>
                ))}
                {ranked.length === 0 && (
                    <div style={{padding: spacing[3], fontSize: typography.fontSize.sm, color: airtableColors.gray.dark1}}>
                        No records to score.
                    </div>
                )}
            </div>
        </div>
    );
}

initializeBlock({interface: () => <ScoringCalculator />});
