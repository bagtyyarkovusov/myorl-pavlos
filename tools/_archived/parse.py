import json

from cms_audit import CHECKPOINT_SOURCE_DIR, MODX_SOURCE_DIR

def extract_insert_values(filename, table_name):
    prefix = f"INSERT INTO `{table_name}`"
    
    statements = []
    current_statement = ""
    in_statement = False
    
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            if not in_statement:
                if line.startswith(prefix):
                    in_statement = True
                    current_statement = line
            else:
                current_statement += line
                
            if in_statement and line.strip().endswith(';'):
                statements.append(current_statement)
                in_statement = False
                current_statement = ""
                
    records = []
    
    for stmt in statements:
        # Extract columns
        columns_part = stmt.split("VALUES")[0]
        columns_str = columns_part.split("(")[1].split(")")[0]
        columns = [c.strip().strip('`') for c in columns_str.split(',')]
        
        # Extract values
        values_str = stmt.split("VALUES")[1].strip()
        if values_str.endswith(';'):
            values_str = values_str[:-1].strip()
            
        in_string = False
        escape_next = False
        current_tuple = []
        current_value = ""
        depth = 0
        
        for char in values_str:
            if escape_next:
                current_value += char
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                current_value += char
                continue
                
            if char == "'":
                in_string = not in_string
                current_value += char
                continue
                
            if not in_string:
                if char == '(':
                    if depth == 0:
                        current_tuple = []
                        current_value = ""
                    else:
                        current_value += char
                    depth += 1
                elif char == ')':
                    depth -= 1
                    if depth == 0:
                        current_tuple.append(current_value.strip())
                        records.append(dict(zip(columns, current_tuple)))
                        current_value = ""
                    else:
                        current_value += char
                elif char == ',' and depth == 1:
                    current_tuple.append(current_value.strip())
                    current_value = ""
                else:
                    current_value += char
            else:
                current_value += char
                
    return records

def clean_val(val):
    if val is None:
        return None
    if val.startswith("'") and val.endswith("'"):
        val = val[1:-1].replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\r', '\r').replace('\\\\', '\\')
        return val
    elif val == 'NULL':
        return None
    elif val.isdigit():
        return int(val)
    else:
        return val

def process():
    print("Parsing modx_site_content...")
    resources_raw = extract_insert_values(MODX_SOURCE_DIR / "ce39229_myorl_21_04.sql", 'modx_site_content')
    print(f"Found {len(resources_raw)} resources.")

    resources = []
    for r in resources_raw:
        clean_r = {k: clean_val(v) for k, v in r.items()}
        resources.append(clean_r)

    published_resources = [r for r in resources if r.get('published') == 1 and r.get('deleted') == 0]
    print(f"Found {len(published_resources)} published resources.")

    resource_dict = {r['id']: r for r in published_resources}

    print("Parsing modx_site_tmplvars...")
    tvs_raw = extract_insert_values(MODX_SOURCE_DIR / "ce39229_myorl_21_04.sql", 'modx_site_tmplvars')
    tv_dict = {clean_val(tv['id']): clean_val(tv['name']) for tv in tvs_raw}
    print(f"Found {len(tv_dict)} template variables.")

    print("Parsing modx_site_tmplvar_contentvalues...")
    tv_vals_raw = extract_insert_values(MODX_SOURCE_DIR / "ce39229_myorl_21_04.sql", 'modx_site_tmplvar_contentvalues')
    print(f"Found {len(tv_vals_raw)} template variable values.")

    tv_counts = 0
    for tv_val in tv_vals_raw:
        cid = clean_val(tv_val.get('contentid'))
        tid = clean_val(tv_val.get('tmplvarid'))
        val = clean_val(tv_val.get('value'))
        
        if cid in resource_dict and tid in tv_dict:
            if 'template_variables' not in resource_dict[cid]:
                resource_dict[cid]['template_variables'] = {}
            resource_dict[cid]['template_variables'][tv_dict[tid]] = val
            tv_counts += 1

    print(f"Mapped {tv_counts} template variables to published resources.")

    tree = []
    for r in published_resources:
        r['children'] = []

    for r in published_resources:
        parent_id = r.get('parent', 0)
        if parent_id != 0 and parent_id in resource_dict:
            resource_dict[parent_id]['children'].append(r)
        else:
            tree.append(r)

    with (MODX_SOURCE_DIR / "published_resources.json").open("w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
        
    with (MODX_SOURCE_DIR / "published_resources_flat.json").open("w", encoding="utf-8") as f:
        json.dump(published_resources, f, ensure_ascii=False, indent=2)

    print("Done!")

if __name__ == "__main__":
    process()
