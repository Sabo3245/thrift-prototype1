// storage.js
// Firebase Storage functions for file uploads

import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage, auth } from './firebase-config.js';

// ========================
// IMAGE UPLOAD FUNCTIONS
// ========================

// Upload single image
export const uploadImage = async (file, folder = 'items') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Validate file
    if (!file) throw new Error('No file provided');
    if (!file.type.startsWith('image/')) throw new Error('File must be an image');
    if (file.size > 5 * 1024 * 1024) throw new Error('File size must be less than 5MB');

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${user.uid}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { 
      success: true, 
      url: downloadURL, 
      path: snapshot.ref.fullPath,
      filename: filename
    };
  } catch (error) {
    console.error('Upload image error:', error);
    return { success: false, error: error.message };
  }
};

// Upload multiple images
export const uploadMultipleImages = async (files, folder = 'items') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    if (!files || files.length === 0) throw new Error('No files provided');
    if (files.length > 5) throw new Error('Maximum 5 images allowed');

    const uploadPromises = Array.from(files).map(file => uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);

    const successfulUploads = results.filter(result => result.success);
    const failedUploads = results.filter(result => !result.success);

    return {
      success: successfulUploads.length > 0,
      uploadedImages: successfulUploads,
      failedUploads: failedUploads,
      totalUploaded: successfulUploads.length,
      totalFailed: failedUploads.length
    };
  } catch (error) {
    console.error('Upload multiple images error:', error);
    return { success: false, error: error.message };
  }
};

// Upload with progress tracking
export const uploadImageWithProgress = (file, folder = 'items', onProgress) => {
  return new Promise((resolve, reject) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Validate file
      if (!file) throw new Error('No file provided');
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 5 * 1024 * 1024) throw new Error('File size must be less than 5MB');

      // Create unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${folder}/${user.uid}/${filename}`);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress callback
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          // Error callback
          console.error('Upload error:', error);
          reject({ success: false, error: error.message });
        },
        async () => {
          // Success callback
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
              filename: filename
            });
          } catch (error) {
            reject({ success: false, error: error.message });
          }
        }
      );
    } catch (error) {
      reject({ success: false, error: error.message });
    }
  });
};

// ========================
// PROFILE IMAGE FUNCTIONS
// ========================

// Upload profile picture
export const uploadProfilePicture = async (file) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const result = await uploadImage(file, 'profiles');
    if (!result.success) return result;

    // Update user profile with new photo URL
    // This would typically be done in auth.js updateUserProfile function
    return {
      success: true,
      photoURL: result.url,
      path: result.path
    };
  } catch (error) {
    console.error('Upload profile picture error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// FILE MANAGEMENT FUNCTIONS
// ========================

// Delete image from storage
export const deleteImage = async (imagePath) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    if (!imagePath) throw new Error('No image path provided');

    // Verify user owns the file (check if path contains user ID)
    if (!imagePath.includes(user.uid)) {
      throw new Error('Not authorized to delete this image');
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);

    return { success: true };
  } catch (error) {
    console.error('Delete image error:', error);
    return { success: false, error: error.message };
  }
};

// Delete multiple images
export const deleteMultipleImages = async (imagePaths) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    if (!imagePaths || imagePaths.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const deletePromises = imagePaths.map(path => deleteImage(path));
    const results = await Promise.all(deletePromises);

    const successfulDeletes = results.filter(result => result.success);

    return {
      success: true,
      deletedCount: successfulDeletes.length,
      totalAttempted: imagePaths.length
    };
  } catch (error) {
    console.error('Delete multiple images error:', error);
    return { success: false, error: error.message };
  }
};

// Get user's uploaded images
export const getUserImages = async (folder = 'items') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userFolderRef = ref(storage, `${folder}/${user.uid}`);
    const result = await listAll(userFolderRef);

    const imagePromises = result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        url: url
      };
    });

    const images = await Promise.all(imagePromises);

    return { success: true, images };
  } catch (error) {
    console.error('Get user images error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// UTILITY FUNCTIONS
// ========================

// Compress image before upload
export const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// Validate image file
export const validateImageFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  if (file.size > 5 * 1024 * 1024) {
    errors.push('File size must be less than 5MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, GIF, and WebP images are allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Generate thumbnail URL (for display optimization)
export const generateThumbnailUrl = (originalUrl, size = 200) => {
  // This is a simple implementation
  // For production, consider using Firebase Extensions or Cloud Functions
  // to generate thumbnails automatically

  if (!originalUrl) return null;

  // For now, return original URL
  // In production, you might modify the URL to request a resized version
  return originalUrl;
};
