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
  const [historyFile, setHistoryFile] = useState(null); 
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false); 

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
      fetchChatHistory();
    } catch (error) {
      console.error('Error initializing PDFChatBot:', error);
    }
  };

  const handleAskQuestion = async () => {
    setLoading(true); 
    try {
      const response = await axios.post('http://localhost:5000/ask', { question });
      setAnswer(response.data.answer);
      fetchChatHistory(); 
    } catch (error) {
      console.error('Error asking question:', error);
      setAnswer('Error asking question. Please try again.');
    }
    setLoading(false); 
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
      fetchPdfFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

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
      fetchChatHistory();
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
      <h1>Interactive PDF Assistant</h1>
      <div className="grid-container">
        <button className="btn-primary" onClick={confirmInitialize}>Initialize PDFChatBot</button>
        <button className="btn-secondary" onClick={openFileModal}>Upload File</button>
        <button className="btn-secondary" onClick={openHistoryModal}>Upload History</button>
        <button className="btn-secondary" onClick={handleHistoryDownload}>Download History</button>
      </div>
      
      <div className="question-container">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question..."
          className="question-input"
        />
        <button className="btn-primary" onClick={handleAskQuestion}>Ask</button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div> 
      ) : (
        answer && <div className="answer"><strong>Answer:</strong> {answer}</div>
      )}

      <h2>Chat History</h2>
      <div className="table-container">
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
      </div>

      <Modal
        isOpen={isFileModalOpen}
        onRequestClose={closeFileModal}
        contentLabel="File Upload Modal"
        className="Modal"
        overlayClassName="Overlay"
      >
        <h2>Upload File</h2>
        <input type="file" onChange={handleFileUpload} />
        <div className="modal-actions">
          <button className="btn-primary" onClick={handleUpload}>Upload</button>
          <button className="btn-secondary" onClick={closeFileModal}>Close</button>
        </div>
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
        <div className="modal-actions">
          <button className="btn-primary" onClick={handleHistoryUpload}>Upload</button>
          <button className="btn-secondary" onClick={closeHistoryModal}>Close</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
