import './App.css';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Modal from 'react-modal';

Modal.setAppElement('#root');


function App() {
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState(null);
  const [answer, setAnswer] = useState('');
  const [pdfFiles, setPdfFiles] = useState([]);
  const [historyFile, setHistoryFile] = useState(null); // New state for history file
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/history');
      setChatHistory(response.data.reverse());
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  useEffect(() => {
    // Fetch PDF files from MySQL database when the component mounts
    fetchPdfFiles();
  }, []);

  const fetchPdfFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/pdf-files');
      setPdfFiles(response.data);
    } catch (error) {
      console.error('Error fetching PDF files:', error);
    }
  };

  const confirmInitialize = () => {
    if (window.confirm("Are you sure you want to initialize the PDFChatBot? This will reset the current state.")) {
      handleInitialize();
    }
  };

  const handleInitialize = async () => {
    try {
      const response = await axios.post('http://localhost:5000/initialize');
      console.log(response.data.message);
    } catch (error) {
      console.error('Error initializing PDFChatBot:', error);
    }
  };

  const handleAskQuestion = async () => {
    setLoading(true); // Set loading to true when starting to fetch the answer
    try {
      const response = await axios.post('http://localhost:5000/ask', { question });
      setAnswer(response.data.answer);
      fetchChatHistory(); // Refresh the chat history after asking a question
    } catch (error) {
      console.error('Error asking question:', error);
      setAnswer('Error asking question. Please try again.');
    }
    setLoading(false); // Set loading to false after getting the answer
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFile(file);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('File uploaded successfully:', response.data);
      // After successful upload, refetch PDF files to update the list
      fetchPdfFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // New functions for history file upload
  const handleHistoryFileUpload = (event) => {
    const file = event.target.files[0];
    setHistoryFile(file);
  };

  const handleHistoryUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', historyFile);
      const response = await axios.post('http://localhost:5000/upload-history', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('History file uploaded successfully:', response.data);
      fetchChatHistory(); // Refresh the chat history after asking a question
    } catch (error) {
      console.error('Error uploading history file:', error);
    }
  };

  const handleHistoryDownload = async () => {
    try {
      const response = await axios.get('http://localhost:5000/download-history', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat_history_download_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading history file:', error);
    }
  };

  const openFileModal = () => {
    setIsFileModalOpen(true);
  };

  const closeFileModal = () => {
    setIsFileModalOpen(false);
  };

  const openHistoryModal = () => {
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  return (
    <div className="App">
      <h1>Chatbot UI</h1>
      <div className="grid-container">
        <button onClick={confirmInitialize}>Initialize PDFChatBot</button>
        <button onClick={openFileModal}>Upload File</button>
        <button onClick={openHistoryModal}>Upload History</button>
        <button onClick={handleHistoryDownload}>Download History</button>
      </div>
      
      {/* <button onClick={handleInitialize}>Initialize PDFChatBot</button> */}
      <div>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question..."
        />
        <button onClick={handleAskQuestion}>Ask</button>
      </div>
      {/* <div>
        <input type="file" onChange={handleFileUpload} />
        <button onClick={handleUpload}>Upload</button>
      </div> */}

        {/* History download */}
      {/* <button onClick={handleHistoryDownload}>Download History</button> */}

      {/* For history upload */}
      {/* <div>
        <input type="file" onChange={handleHistoryFileUpload} />
        <button onClick={handleHistoryUpload}>Upload History</button>
      </div> */}
      {loading ? (
        <div>Loading...</div> // Loading view
      ) : (
        answer && <div><strong>Answer:</strong> {answer}</div>
      )}
      <h2>Chat History</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Question</th>
            <th>Answer</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {chatHistory.map((history) => (
            <tr key={history.id}>
              <td>{history.id}</td>
              <td>{history.question}</td>
              <td>{history.answer}</td>
              <td>{history.time}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        isOpen={isFileModalOpen}
        onRequestClose={closeFileModal}
        contentLabel="File Upload Modal"
        className="Modal"
        overlayClassName="Overlay"
      >
        <h2>Upload File</h2>
        <input type="file" onChange={handleFileUpload} />
        <button onClick={handleUpload}>Upload</button>
        <button onClick={closeFileModal}>Close</button>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onRequestClose={closeHistoryModal}
        contentLabel="History Upload Modal"
        className="Modal"
        overlayClassName="Overlay"
      >
        <h2>Upload History</h2>
        <input type="file" onChange={handleHistoryFileUpload} />
        <button onClick={handleHistoryUpload}>Upload</button>
        <button onClick={closeHistoryModal}>Close</button>
      </Modal>
    </div>
    
  );
}

export default App;
