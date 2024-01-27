import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/ResumeScore.module.css'; // Import the CSS module file

const ResumeScore = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const test = async () => {
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await axios.post('http://localhost:3001/test', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Assuming the server responds with the image name
      const imageName = response.data.fileName;
      // Navigate to '/ChatBot' with the image name passed as a prop
      navigate('/chat', { state: { imageName } });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles['prepare-container']}>
      <h2 className={styles['prepare-heading']}>Prepare For your Interviews</h2>
      <div className={styles['file-input-container']}>
        <input type="file" onChange={handleFileChange} className={styles['file-input']} />
        <button onClick={test} disabled={!selectedFile} className={styles['upload-button']}>
          Upload File
        </button>
      </div>
    </div>
  );
};

export default ResumeScore;
