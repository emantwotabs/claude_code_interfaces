import * as React from 'react';
import {
    initializeBlock,
    useRecords,
    useCustomProperties,
    expandRecord,
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

const TEXT_TYPES = new Set<FieldType>([
    FieldType.SINGLE_LINE_TEXT,
    FieldType.MULTILINE_TEXT,
    FieldType.EMAIL,
    FieldType.PHONE_NUMBER,
    FieldType.URL,
]);

function getCustomProperties(base: Base) {
    // Source 2 is optional; when its Table property is left unset the directory just
    // searches Source 1. Field properties still need a concrete table at
    // schema-definition time (see the other templates in this repo for why), so
    // searchField2 is scoped to base.tables[1] as a reasonable default.
    const table1 = base.tables[0];
    const table2 = base.tables[1] ?? base.tables[0];
    const isTextLike = (field: {id: string; config: FieldConfig}) => TEXT_TYPES.has(field.config.type);
    return [
        {key: 'table1', label: 'Source 1 — Table', type: 'table' as const, defaultValue: table1},
        {
            key: 'searchField1',
            label: 'Source 1 — Title Field',
            type: 'field' as const,
            table: table1,
            shouldFieldBeAllowed: isTextLike,
        },
        {key: 'table2', label: 'Source 2 — Table (optional)', type: 'table' as const},
        {
            key: 'searchField2',
            label: 'Source 2 — Title Field',
            type: 'field' as const,
            table: table2,
            shouldFieldBeAllowed: isTextLike,
        },
    ];
}

interface DirectoryItem {
    id: string;
    title: string;
    source: string;
    record: AirtableRecord;
    table: Table;
}

function SearchDirectory() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table1 = customPropertyValueByKey.table1 as Table | null | undefined;
    const searchField1Prop = customPropertyValueByKey.searchField1 as Field | null | undefined;
    const table2 = customPropertyValueByKey.table2 as Table | null | undefined;
    const searchField2Prop = customPropertyValueByKey.searchField2 as Field | null | undefined;

    if (!table1) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Source 1 Table.</div>;
    }

    const meta1 = getFieldMeta(table1, searchField1Prop?.id ?? '');
    const searchField1 = searchField1Prop && TEXT_TYPES.has(meta1.type as FieldType) ? searchField1Prop : null;

    if (!searchField1) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose a Source 1 Title Field (a text/email/phone/URL field) on{' '}
                {table1.name}.
            </div>
        );
    }

    let searchField2: Field | null = null;
    if (table2) {
        const meta2 = getFieldMeta(table2, searchField2Prop?.id ?? '');
        searchField2 = searchField2Prop && TEXT_TYPES.has(meta2.type as FieldType) ? searchField2Prop : null;
    }

    return (
        <DirectoryBody
            table1={table1}
            searchField1={searchField1}
            table2={table2 && searchField2 ? table2 : null}
            searchField2={searchField2}
        />
    );
}

function DirectoryBody({
    table1,
    searchField1,
    table2,
    searchField2,
}: {
    table1: Table;
    searchField1: Field;
    table2: Table | null;
    searchField2: Field | null;
}) {
    const [items1, setItems1] = React.useState<DirectoryItem[]>([]);
    const [items2, setItems2] = React.useState<DirectoryItem[]>([]);
    const [query, setQuery] = React.useState('');

    const combined = React.useMemo(() => {
        const all = [...items1, ...items2];
        const q = query.trim().toLowerCase();
        const filtered = q ? all.filter((item) => item.title.toLowerCase().includes(q)) : all;
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }, [items1, items2, query]);

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
            <DirectorySource table={table1} searchField={searchField1} onItems={setItems1} />
            {table2 && searchField2 && <DirectorySource table={table2} searchField={searchField2} onItems={setItems2} />}

            <input
                className="dir-search"
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{marginBottom: spacing[4]}}
            />

            <div className="dir-list">
                {combined.map((item) => (
                    <button
                        key={`${item.table.id}:${item.id}`}
                        type="button"
                        className="dir-row"
                        onClick={() => {
                            if (item.table.hasPermissionToExpandRecords()) expandRecord(item.record);
                        }}
                    >
                        <span className="dir-row-title">{item.title || '(untitled)'}</span>
                        <Badge tone="gray">{item.source}</Badge>
                    </button>
                ))}
                {combined.length === 0 && <div className="dir-empty">No matches.</div>}
            </div>
        </div>
    );
}

function DirectorySource({
    table,
    searchField,
    onItems,
}: {
    table: Table;
    searchField: Field;
    onItems: (items: DirectoryItem[]) => void;
}) {
    const records = useRecords(table);

    React.useEffect(() => {
        onItems(
            records.map((record) => ({
                id: record.id,
                title: record.getCellValueAsString(searchField.id),
                source: table.name,
                record,
                table,
            })),
        );
        // onItems is a useState setter — stable identity, safe to omit from deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, searchField, table]);

    return null;
}

initializeBlock({interface: () => <SearchDirectory />});
