'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, storage } from './firebase'; // Adjust the path as needed
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  TextField,
  Button,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import { Delete, Edit, BakeryDining } from '@mui/icons-material';

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [image, setImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Handle item form submission
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (newItem.name.trim() && newItem.quantity) {
      try {
        if (editItem) {
          await updateDoc(doc(db, 'items', editItem.id), {
            name: newItem.name.trim(),
            quantity: newItem.quantity,
          });
          setEditItem(null);
        } else {
          await addDoc(collection(db, 'items'), {
            name: newItem.name.trim(),
            quantity: newItem.quantity,
          });
        }
        setNewItem({ name: '', quantity: '' });
      } catch (error) {
        console.error('Error handling item submit:', error);
        setOpenSnackbar(true);
        setUploadSuccess(false);
      }
    }
  };

  // Fetch items from Firestore
  useEffect(() => {
    const q = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsArr = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setItems(itemsArr);
    });
    return () => unsubscribe();
  }, []);

  // Delete an item
  const deleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      console.error('Error deleting item:', error);
      setOpenSnackbar(true);
      setUploadSuccess(false);
    }
  };

  // Handle edit item
  const handleEdit = (item) => {
    setNewItem({ name: item.name, quantity: item.quantity });
    setEditItem(item);
  };

  // Handle search input change
  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm)
  );

  // Handle image file selection
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    } else {
      console.error('No image selected.');
    }
  };

  // Upload and classify image
  const uploadImage = async () => {
    if (image) {
      setUploading(true);
      try {
        // Upload image to Firebase Storage
        const imageRef = ref(storage, `images/${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        console.log('Upload success:', snapshot);

        // Get the image URL
        const url = await getDownloadURL(snapshot.ref);

        // Classify the image and get the result
        const classificationResult = await classifyImage(url);
        
        // Update Firestore with classified name and image URL
        await updateClassifiedItem(classificationResult, url);

        // Set success state and open Snackbar
        setUploadSuccess(true);
        setOpenSnackbar(true);
      } catch (error) {
        console.error('Error uploading image:', error);
        setUploadSuccess(false);
        setOpenSnackbar(true);
      } finally {
        setUploading(false);
      }
    } else {
      console.error('No image selected.');
    }
  };

  // Function to classify the image using Google Cloud Vision API
const classifyImage = async (imageUrl) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY; 
    if (!apiKey) {
      throw new Error('Google Vision API key is missing.');
    }

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl,
            },
          },
          features: [
            {
              type: 'LABEL_DETECTION',
              maxResults: 10, 
            },
          ],
        },
      ],
    };

    console.log('Request Body:', JSON.stringify(requestBody, null, 2)); // Log the request body

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await response.text(); // Get the raw response text
    console.log('Raw API Response:', rawResponse); // Log the raw response

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = JSON.parse(rawResponse); // Parse the raw response as JSON
    console.log('Parsed API Response Data:', data); // Log the parsed response

    // Extract the label annotations
    const labels = data.responses[0]?.labelAnnotations || [];
    if (labels.length > 0) {
      // Sort labels by confidence score in descending order and return the most relevant label
      labels.sort((a, b) => b.score - a.score);
      return labels[0].description; // Return the description of the most relevant label
    }

    return 'No label found'; // Fallback if no labels are returned
  } catch (error) {
    console.error('Error classifying image:', error); // Log the error message
    return 'Item'; // Fallback error message
  }
};


  // Update Firestore with classified name and image URL
  const updateClassifiedItem = async (classificationResult, imageUrl) => {
    try {
      if (editItem) {
        await updateDoc(doc(db, 'items', editItem.id), {
          name: classificationResult,
          imageUrl: imageUrl,
        });
        setEditItem(null);
      } else {
        await addDoc(collection(db, 'items'), {
          name: classificationResult,
          quantity: '1', // Default quantity or prompt user to enter
          imageUrl: imageUrl,
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setOpenSnackbar(true);
      setUploadSuccess(false);
    }
  };

  // Close Snackbar
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Styles
  const pinkColor = '#FFB6B9';
  const snackbarPink = '#F7A1A1';

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px', backgroundColor: '#FAE3D9' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" gutterBottom style={{ marginBottom: '24px', color: '#333333' }}>
          <BakeryDining style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Pantry Inventory
        </Typography>
        <Paper style={{ padding: '24px', backgroundColor: pinkColor, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearch}
            style={{ marginBottom: '24px', backgroundColor: '#F5F5F5' }}
          />
          <form
            onSubmit={handleItemSubmit}
            style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}
          >
            <TextField
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              variant="outlined"
              placeholder="Enter Item"
              style={{ flex: 1, backgroundColor: '#FAFAFA' }}
            />
            <TextField
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              variant="outlined"
              placeholder="Enter Quantity"
              style={{ flex: 1, backgroundColor: '#FAFAFA' }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              style={{ alignSelf: 'center', backgroundColor: pinkColor, color: '#FFF', '&:hover': { backgroundColor: '#FF9A9A' } }}
            >
              {editItem ? 'Update' : 'Add'}
            </Button>
          </form>
          <Grid container spacing={2}>
            {filteredItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <Card style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFF5F0', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>
                  <CardContent style={{ flex: 1 }}>
                    <Typography variant="h6" style={{ color: '#333333', fontWeight: 'bold' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" style={{ color: '#666666' }}>
                      Quantity: {item.quantity}
                    </Typography>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxWidth: '200px',
                          borderRadius: '4px',
                          marginTop: '8px',
                          objectFit: 'cover', // Ensures the image covers the area
                          display: 'block',
                          maxHeight: '200px', // Adjust this value as needed
                        }}
                      />
                    )}
                  </CardContent>
                  <Divider />
                  <Grid container justifyContent="flex-end" spacing={1} style={{ padding: '8px' }}>
                    <Grid item>
                      <IconButton onClick={() => handleEdit(item)} color="primary">
                        <Edit />
                      </IconButton>
                    </Grid>
                    <Grid item>
                      <IconButton onClick={() => deleteItem(item.id)} color="secondary">
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            ))}
          </Grid>
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <input
              type="file"
              accept="image/*"
              id="file-input"
              onChange={handleImageChange}
              style={{ display: 'none' }} // Hide the default file input
            />
            <label htmlFor="file-input">
              <Button
                component="span"
                variant="contained"
                color="secondary"
                style={{ marginTop: '12px', backgroundColor: pinkColor, color: '#FFF', '&:hover': { backgroundColor: '#FF9A9A' } }}
              >
                Choose File
              </Button>
            </label>
            <Button
              variant="contained"
              color="secondary"
              onClick={uploadImage}
              style={{ marginTop: '12px', backgroundColor: pinkColor, color: '#FFF', '&:hover': { backgroundColor: '#FF9A9A' } }}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload and Classify Image'}
            </Button>
            {openSnackbar && (
              <Snackbar
                open={openSnackbar}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                style={{ marginTop: '12px' }}
              >
                <Alert
                  onClose={handleCloseSnackbar}
                  severity={uploadSuccess ? "success" : "error"}
                  sx={{ width: '100%', backgroundColor: snackbarPink, color: '#FFF' }}
                >
                  {uploadSuccess ? 'Image uploaded and classified successfully!' : 'An error occurred. Please try again.'}
                </Alert>
              </Snackbar>
            )}
          </div>
        </Paper>
      </Container>
    </main>
  );
}
