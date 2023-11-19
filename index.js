/* eslint-disable no-unused-vars */
const https = require('https');
const express = require('express');
const {google} = require('googleapis');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());

const httpsServer = https.createServer({
  key: fs.readFileSync('./privkey.pem'),
  cert: fs.readFileSync('./fullchain.pem'),
}, app);

const storage = multer.diskStorage({
  //destination: 'uploads',
  filename: (req,file,callback) => {
    const extension = file.originalname.split('.').pop();
    callback(null,`${file.fieldname}-${Date.now()}.${extension}`);
  }
});

const upload = multer({storage: storage});
app.use(express.static('public'));

app.get('/', (req,res) => {
  res.send({
    message: 'Bem-vindo(a) ao google-drive-upload-backend.'
  });
});

app.post('/upload', upload.array('files'), async (req,res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'keys.json',
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    console.log(auth);
    const drive = google.drive({
      version: 'v3',
      auth: auth
    });
    const uploadedFiles = [];
    for (let file of req.files) {
      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimeType,
          parents: [process.env.DRIVE_URL]
        },
        media: {
          body: fs.createReadStream(file.path)
        }
      });
      uploadedFiles.push(response.data);
    }
    res.json({files: uploadedFiles});
  }
  catch (e) {
    console.log('Error uploading files: ', e);
    res.status(500).json({error:'An error ocurred during file upload.'});
  }
});

const PORT = process.env.PORT || 7443;

httpsServer.listen(PORT, () => {
  console.log(`HTTPS Server running on port ${PORT}`);
});
