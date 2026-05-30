import os


def is_heic_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in ['.heic', '.heif']


def find_heic_files(path, recursive=True):
    path = os.path.abspath(path)
    heic_files = []
    if os.path.isfile(path):
        if is_heic_file(path):
            heic_files.append(path)
        return heic_files
    if os.path.isdir(path):
        if recursive:
            for root, dirs, files in os.walk(path):
                for filename in files:
                    if is_heic_file(filename):
                        heic_files.append(os.path.join(root, filename))
        else:
            for filename in os.listdir(path):
                full_path = os.path.join(path, filename)
                if os.path.isfile(full_path) and is_heic_file(filename):
                    heic_files.append(full_path)
    return sorted(heic_files)


def get_output_path(input_path, input_base=None, output_base=None, preserve_structure=True):
    input_path = os.path.abspath(input_path)
    if output_base is None:
        return os.path.splitext(input_path)[0] + '.jpg'
    output_base = os.path.abspath(output_base)
    if input_base is None or not preserve_structure:
        filename = os.path.basename(input_path)
        return os.path.join(output_base, os.path.splitext(filename)[0] + '.jpg')
    input_base = os.path.abspath(input_base)
    try:
        rel_path = os.path.relpath(input_path, input_base)
    except ValueError:
        rel_path = os.path.basename(input_path)
    rel_path_jpg = os.path.splitext(rel_path)[0] + '.jpg'
    return os.path.join(output_base, rel_path_jpg)


def get_conversion_tasks(input_path, output_dir=None, preserve_structure=True, recursive=True):
    input_path = os.path.abspath(input_path)
    heic_files = find_heic_files(input_path, recursive=recursive)
    input_base = input_path if os.path.isdir(input_path) else os.path.dirname(input_path)
    tasks = []
    for heic_file in heic_files:
        output_file = get_output_path(heic_file, input_base, output_dir, preserve_structure)
        tasks.append((heic_file, output_file))
    return tasks
