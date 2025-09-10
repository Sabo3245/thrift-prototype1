# Create a summary of all created files
import os

def list_files_in_directory(directory, prefix=""):
    files_list = []
    items = sorted(os.listdir(directory))
    
    for item in items:
        item_path = os.path.join(directory, item)
        if os.path.isdir(item_path):
            files_list.append(f"{prefix}📁 {item}/")
            sub_files = list_files_in_directory(item_path, prefix + "  ")
            files_list.extend(sub_files)
        else:
            file_size = os.path.getsize(item_path)
            size_kb = round(file_size / 1024, 1)
            files_list.append(f"{prefix}📄 {item} ({size_kb}KB)")
    
    return files_list

# List all files in the backend directory
print("📋 Campus Thrift Backend - Complete File Structure")
print("=" * 50)
print()

files = list_files_in_directory('campus-thrift-backend')
for file in files:
    print(file)

print()
print(f"✅ Total files created: {len([f for f in files if '📄' in f])}")

# Create a zip file of the entire backend
import shutil
shutil.make_archive('campus-thrift-backend-complete', 'zip', 'campus-thrift-backend')
print(f"📦 Created campus-thrift-backend-complete.zip")

# Calculate total size
def get_directory_size(directory):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(directory):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            total_size += os.path.getsize(filepath)
    return total_size

total_size = get_directory_size('campus-thrift-backend')
size_mb = round(total_size / (1024 * 1024), 2)
print(f"💾 Total project size: {size_mb}MB")

print()
print("🎉 Campus Thrift Backend is ready!")
print("📖 Please see README.md for setup instructions")