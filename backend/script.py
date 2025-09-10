# Create the backend server structure and files
import os

# Create directory structure
directories = [
    'campus-thrift-backend',
    'campus-thrift-backend/models',
    'campus-thrift-backend/routes',
    'campus-thrift-backend/middleware',
    'campus-thrift-backend/controllers',
    'campus-thrift-backend/utils',
    'campus-thrift-backend/config'
]

for directory in directories:
    os.makedirs(directory, exist_ok=True)

print("Created backend directory structure:")
for directory in directories:
    print(f"✓ {directory}")