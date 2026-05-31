def process_raw_data(raw_data, config, options, user_context, preferences):
    result = []
    for item in raw_data:
        processed = _process_single_item(item, config, options, user_context, preferences)
        result.append(processed)
    return _finalize_processed_result(result, config, options, preferences)


def _process_single_item(item, config, options, user_context, preferences):
    processed = {}
    if isinstance(item, dict):
        for key, value in item.items():
            if key in config.get("include_fields", []):
                processed[key] = _process_value(value, config)
    elif isinstance(item, list):
        processed["items"] = _clean_list_items(item)
    elif isinstance(item, str):
        processed["value"] = item.strip()
    processed = _apply_options(processed, options, user_context, preferences)
    return processed


def _process_value(value, config):
    if isinstance(value, str):
        result = value.strip().upper()
        max_len = config.get("max_length", 100)
        if len(result) > max_len:
            result = result[:max_len]
        return result
    elif isinstance(value, (int, float)):
        return value * config.get("multiplier", 1)
    elif isinstance(value, list):
        return _process_nested_list(value)
    elif isinstance(value, dict):
        return _process_nested_dict(value)
    return value


def _process_nested_list(value):
    sub_processed = []
    for sub_item in value:
        if isinstance(sub_item, str):
            sub_processed.append(sub_item.strip().lower())
        elif isinstance(sub_item, dict):
            sub_clean = {}
            for sk, sv in sub_item.items():
                if isinstance(sv, str):
                    sub_clean[sk] = sv.strip()
            sub_processed.append(sub_clean)
    return sub_processed


def _process_nested_dict(value):
    inner_processed = {}
    for ik, iv in value.items():
        if isinstance(iv, str):
            inner_processed[ik] = iv.strip()
    return inner_processed


def _clean_list_items(item):
    list_processed = []
    for list_item in item:
        if isinstance(list_item, str):
            list_processed.append(list_item.strip().title())
    return list_processed


def _apply_options(processed, options, user_context, preferences):
    if options.get("validate"):
        for key in processed:
            if not processed[key]:
                processed[key] = options.get("default_value", "")
    if options.get("transform"):
        for key in processed:
            if isinstance(processed[key], str) and options.get("prefix"):
                processed[key] = options["prefix"] + processed[key]
    if user_context.get("filter_empty"):
        processed = {k: v for k, v in processed.items() if v}
    if preferences.get("sort_keys"):
        processed = dict(sorted(processed.items()))
    return processed


def _finalize_processed_result(result, config, options, preferences):
    validated = _validate_schema(result, options, config)
    transformed = _flatten_items(validated, preferences)
    filtered = _filter_by_field_count(transformed, config)
    return _add_metadata(filtered, options)


def _validate_schema(result, options, config):
    validated = []
    for item in result:
        if options.get("validate_schema"):
            required = config.get("required_fields", [])
            if all(f in item for f in required):
                validated.append(item)
        else:
            validated.append(item)
    return validated


def _flatten_items(validated, preferences):
    transformed = []
    for item in validated:
        if preferences.get("flatten"):
            flat_item = {}
            for k, v in item.items():
                if isinstance(v, dict):
                    for ik, iv in v.items():
                        flat_item[f"{k}_{ik}"] = iv
                else:
                    flat_item[k] = v
            transformed.append(flat_item)
        else:
            transformed.append(item)
    return transformed


def _filter_by_field_count(transformed, config):
    filtered = []
    for item in transformed:
        keep = True
        if config.get("min_fields") and len(item) < config["min_fields"]:
            keep = False
        if config.get("max_fields") and len(item) > config["max_fields"]:
            keep = False
        if keep:
            filtered.append(item)
    return filtered


def _add_metadata(filtered, options):
    final_output = []
    for item in filtered:
        if options.get("add_metadata"):
            item["_timestamp"] = options.get("timestamp", 0)
            item["_source"] = options.get("source", "unknown")
        final_output.append(item)
    return final_output


def format_data(data, format_type):
    if format_type == "json":
        import json
        return json.dumps(data, indent=2)
    elif format_type == "csv":
        return _format_csv(data)
    elif format_type == "xml":
        return _format_xml(data)
    return str(data)


def _format_csv(data):
    lines = []
    for item in data:
        lines.append(",".join(str(v) for v in item.values()))
    return "\n".join(lines)


def _format_xml(data):
    lines = ["<root>"]
    for item in data:
        lines.append("  <item>")
        for k, v in item.items():
            lines.append(f"    <{k}>{v}</{k}>")
        lines.append("  </item>")
    lines.append("</root>")
    return "\n".join(lines)
