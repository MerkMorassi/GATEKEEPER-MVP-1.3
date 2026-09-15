import os
import zipfile

def make_zip():
    zip_filename = 'public/gatekeeper-latest.zip'
    os.makedirs('public', exist_ok=True)
    ignored = {'.git', 'node_modules', 'dist', 'public', '.cache'}
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ignored]
            for f in files:
                if f.endswith(('.zip', '.tar.gz', '.tmp', '.log')) and f != 'package.json':
                    continue
                filepath = os.path.join(root, f)
                arcname = os.path.relpath(filepath, '.')
                zipf.write(filepath, arcname)

if __name__ == '__main__':
    make_zip()
