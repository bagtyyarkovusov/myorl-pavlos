import json

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
    print("Parsing modx_site_tmplvars...")
    tvs_raw = extract_insert_values('ce39229_myorl_21_04.sql', 'modx_site_tmplvars')
    tvs = []
    for tv in tvs_raw:
        tvs.append({
            'id': clean_val(tv.get('id')),
            'name': clean_val(tv.get('name')),
            'caption': clean_val(tv.get('caption')),
            'description': clean_val(tv.get('description')),
            'type': clean_val(tv.get('type')),
            'elements': clean_val(tv.get('elements')),
            'default_text': clean_val(tv.get('default_text'))
        })

    with open('tv_definitions.json', 'w', encoding='utf-8') as f:
        json.dump(tvs, f, ensure_ascii=False, indent=2)

    print("Done!")

if __name__ == "__main__":
    process()
