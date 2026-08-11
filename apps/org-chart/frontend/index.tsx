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
import type {Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {spacing, typography} from '@claude-code-interfaces/tokens';
import {Badge} from '@claude-code-interfaces/primitives';
import {getFieldMeta} from '@claude-code-interfaces/helpers';
import './style.css';

const ROOT_KEY = '__root__';

function getCustomProperties(base: Base) {
    const table = base.tables[0];
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: table},
        {
            key: 'parentField',
            label: 'Parent Link Field (e.g. "Reports to")',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: {id: string; config: FieldConfig}) =>
                field.config.type === FieldType.MULTIPLE_RECORD_LINKS,
        },
    ];
}

function OrgChart() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const parentFieldProp = customPropertyValueByKey.parentField as Field | null | undefined;

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }

    const meta = getFieldMeta(table, parentFieldProp?.id ?? '');
    const parentField = parentFieldProp && meta.type === FieldType.MULTIPLE_RECORD_LINKS ? parentFieldProp : null;

    if (!parentField) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose a linked-record Parent Field (e.g. &ldquo;Reports to&rdquo;) on{' '}
                {table.name} — it should link records in this table to their own table.
            </div>
        );
    }

    return <OrgChartForTable table={table} parentField={parentField} />;
}

function OrgChartForTable({table, parentField}: {table: Table; parentField: Field}) {
    const records = useRecords(table);

    const childrenByParent = React.useMemo(() => {
        const map = new Map<string, AirtableRecord[]>();
        for (const record of records) {
            const links = record.getCellValue(parentField.id) as Array<{id: string}> | null;
            const parentId = links && links.length > 0 ? links[0].id : null;
            const key = parentId ?? ROOT_KEY;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(record);
        }
        return map;
    }, [records, parentField]);

    // If nothing resolved to "no parent" — every record links to something, likely a
    // cycle or a field pointing outside this table — fall back to showing everything
    // flat as top-level rather than rendering nothing.
    const trueRoots = childrenByParent.get(ROOT_KEY) ?? [];
    const roots = trueRoots.length > 0 ? trueRoots : records;
    const isFallback = trueRoots.length === 0 && records.length > 0;

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
            {isFallback && (
                <div className="org-note">
                    No record in {table.name} has an empty {parentField.name} — showing all {records.length} records
                    as top-level.
                </div>
            )}
            <div className="org-tree">
                {roots.map((record) => (
                    <OrgNode key={record.id} record={record} childrenByParent={childrenByParent} depth={0} visited={new Set()} />
                ))}
                {roots.length === 0 && <div className="org-note">No records in {table.name}.</div>}
            </div>
        </div>
    );
}

function OrgNode({
    record,
    childrenByParent,
    depth,
    visited,
}: {
    record: AirtableRecord;
    childrenByParent: Map<string, AirtableRecord[]>;
    depth: number;
    visited: Set<string>;
}) {
    const [open, setOpen] = React.useState(depth < 2);

    if (visited.has(record.id)) {
        return (
            <div className="org-node-row org-node-cycle" style={{paddingLeft: depth * 20}}>
                {record.name || '(unnamed)'} — already shown above (circular link)
            </div>
        );
    }

    const nextVisited = new Set(visited);
    nextVisited.add(record.id);
    const children = childrenByParent.get(record.id) ?? [];

    return (
        <div className="org-node">
            <div className="org-node-row" style={{paddingLeft: depth * 20}}>
                {children.length > 0 ? (
                    <button
                        type="button"
                        className="org-toggle"
                        onClick={() => setOpen((o) => !o)}
                        aria-label={open ? 'Collapse' : 'Expand'}
                        aria-expanded={open}
                    >
                        {open ? '▾' : '▸'}
                    </button>
                ) : (
                    <span className="org-toggle org-toggle-leaf" />
                )}
                <span className="org-node-name">{record.name || '(unnamed)'}</span>
                {children.length > 0 && <Badge tone="gray">{children.length}</Badge>}
            </div>
            {open && children.length > 0 && (
                <div className="org-children">
                    {children.map((child) => (
                        <OrgNode
                            key={child.id}
                            record={child}
                            childrenByParent={childrenByParent}
                            depth={depth + 1}
                            visited={nextVisited}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <OrgChart />});
