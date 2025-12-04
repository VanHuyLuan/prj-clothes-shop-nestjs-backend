# Thunder Client Test Collection

## Test Upload API

### 1. Get Config
GET http://localhost:4000/upload/config

### 2. Upload Single Image
POST http://localhost:4000/upload/image
Content-Type: multipart/form-data

# Body (form-data):
# file: [Browse to select image file]
# folder: products

### 3. Upload Multiple Images  
POST http://localhost:4000/upload/multiple
Content-Type: multipart/form-data

# Body (form-data):
# files: [Browse to select image file 1]
# files: [Browse to select image file 2]
# folder: products

### 4. Delete Image
DELETE http://localhost:4000/upload/image?url=YOUR_CLOUDINARY_URL_HERE

---

## Sample PowerShell Commands

# Test config
Invoke-WebRequest -Uri "http://localhost:4000/upload/config" -Method GET

# Upload file (replace with actual file path)
$form = @{
    file = Get-Item "C:\path\to\your\image.jpg"
    folder = "products"
}
Invoke-WebRequest -Uri "http://localhost:4000/upload/image" -Method POST -Form $form

# Upload multiple files
$form = @{
    files = @(Get-Item "C:\path\to\image1.jpg", Get-Item "C:\path\to\image2.jpg")
    folder = "products"
}
Invoke-WebRequest -Uri "http://localhost:4000/upload/multiple" -Method POST -Form $form