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
import {Badge, LinkedRecordPills} from '@claude-code-interfaces/primitives';
import './style.css';

function getCustomProperties(base: Base) {
    const table = base.tables[0];
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: table},
        {
            key: 'statusField',
            label: 'Status Field',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: {id: string; config: FieldConfig}) => field.config.type === FieldType.SINGLE_SELECT,
        },
        // Free-text rather than an enum: the value has to match one of statusField's
        // real option names, and those aren't known until statusField itself is
        // chosen — custom properties can't read each other's values at setup time.
        {key: 'pendingValue', label: 'Status value meaning "pending"', type: 'string' as const, defaultValue: ''},
        {key: 'approveValue', label: 'Status value to set on Approve', type: 'string' as const, defaultValue: 'Approved'},
        {key: 'rejectValue', label: 'Status value to set on Reject', type: 'string' as const, defaultValue: 'Rejected'},
    ];
}

function ReviewQueue() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const statusField = customPropertyValueByKey.statusField as Field | null | undefined;
    const pendingValue = (customPropertyValueByKey.pendingValue as string | undefined) ?? '';
    const approveValue = (customPropertyValueByKey.approveValue as string | undefined) || 'Approved';
    const rejectValue = (customPropertyValueByKey.rejectValue as string | undefined) || 'Rejected';

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }
    if (!statusField || statusField.type !== FieldType.SINGLE_SELECT) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose a single select Status Field on {table.name}.
            </div>
        );
    }

    return (
        <ReviewQueueForTable
            table={table}
            statusField={statusField}
            pendingValue={pendingValue}
            approveValue={approveValue}
            rejectValue={rejectValue}
        />
    );
}

function ReviewQueueForTable({
    table,
    statusField,
    pendingValue,
    approveValue,
    rejectValue,
}: {
    table: Table;
    statusField: Field;
    pendingValue: string;
    approveValue: string;
    rejectValue: string;
}) {
    const records = useRecords(table);
    const [index, setIndex] = React.useState(0);

    const pending = React.useMemo(
        () => records.filter((record) => record.getCellValueAsString(statusField.id) === pendingValue),
        [records, statusField, pendingValue],
    );

    const detailFields = React.useMemo(
        () => table.fields.filter((field) => field.id !== statusField.id),
        [table, statusField],
    );

    const current = pending[Math.min(index, pending.length - 1)] ?? null;
    const canDecide = current ? table.hasPermissionToUpdateRecord(current, {[statusField.id]: undefined}) : false;

    const decide = React.useCallback(
        async (value: string) => {
            if (!current || !canDecide) return;
            await table.updateRecordAsync(current, {[statusField.id]: {name: value}});
            setIndex((i) => Math.min(i, Math.max(pending.length - 2, 0)));
        },
        [current, canDecide, table, statusField, pending.length],
    );

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'a' || e.key === 'ArrowRight') decide(approveValue);
            if (e.key === 'r' || e.key === 'x' || e.key === 'ArrowLeft') decide(rejectValue);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [decide, approveValue, rejectValue]);

    if (pending.length === 0) {
        return (
            <div style={{padding: spacing[4], fontFamily: typography.fontFamily}}>
                <Badge tone="green">Queue clear</Badge>
                <div style={{marginTop: spacing[2], color: airtableColors.gray.dark1, fontSize: typography.fontSize.sm}}>
                    No records where {statusField.name} is {pendingValue ? `"${pendingValue}"` : 'blank'}.
                </div>
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
            <div className="review-progress">
                {index + 1} of {pending.length} pending
            </div>

            {current && (
                <div className="review-card">
                    <div className="review-title">{current.name || '(unnamed)'}</div>
                    <div className="review-fields">
                        {detailFields.map((field) => (
                            <div key={field.id} className="review-field-row">
                                <span className="review-field-label">{field.name}</span>
                                <span className="review-field-value">
                                    {field.type === FieldType.MULTIPLE_RECORD_LINKS ? (
                                        <LinkedRecordPills
                                            records={
                                                (current.getCellValue(field.id) as Array<{id: string; name: string}> | null) ?? []
                                            }
                                        />
                                    ) : (
                                        current.getCellValueAsString(field.id) || '—'
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="review-actions">
                        <button
                            type="button"
                            className="review-btn review-btn-reject"
                            disabled={!canDecide}
                            onClick={() => decide(rejectValue)}
                        >
                            Reject <span className="review-kbd">R</span>
                        </button>
                        <button
                            type="button"
                            className="review-btn review-btn-approve"
                            disabled={!canDecide}
                            onClick={() => decide(approveValue)}
                        >
                            Approve <span className="review-kbd">A</span>
                        </button>
                    </div>
                    {!canDecide && (
                        <div className="review-permission-note">
                            You don&apos;t have permission to update {statusField.name} on this record.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <ReviewQueue />});
