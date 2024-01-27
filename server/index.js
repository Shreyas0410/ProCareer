const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAsrtT_-aDjGeQ9lRkV9I2hMlNyHxFFEcA");
const model = genAI.getGenerativeModel({ model: "gemini-pro"});
const imagemodel = genAI.getGenerativeModel({ model: "gemini-pro-vision" })

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const uploadDirectory = 'uploads';

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, uploadDirectory));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post('/test', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const fileName = req.file.originalname;

    console.log('File uploaded:', fileName);

    // Send back the file name in the response
    res.status(200).json({ fileName });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/resumescore', upload.single('image'), async (req, res) => {
  console.log("Calculating Your Score!")
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    const imageName = req.file.originalname;
    const imagePath = path.join(__dirname, uploadDirectory, imageName);
    console.log(imagePath);
    var prompt = "Extract information from the resume";
    const image = {
      inlineData : {
        data : Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType : "image/png",
      },
    };
    const result = await imagemodel.generateContent([prompt, image]);
    var resumeInfo = result.response.text();

    var prompt = `Based on the resume ${resumeInfo} find the flaws in first person and list them, grade the resume out of 100. Don't write in bold`
    const feedback = await model.generateContent([prompt]);
    var finalfeedback = feedback.response.text();
    console.log(finalfeedback)
    res.status(200).json({feedback : finalfeedback})

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
})


app.post('/extract', async (req, res) => {
  try {
    console.log("Started")
    const imageName = req.body.imageName;
    const imagePath = path.join(__dirname, uploadDirectory, imageName);
    console.log(imagePath);
    var prompt = "Extract information from the resume.";
    const image = {
    inlineData: {
        data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType: "image/png",
    },
    };
  
    const result = await imagemodel.generateContent([prompt, image]);
    var resumeInfo = result.response.text()
    const chat = model.startChat({
        history : [
          {
            role : "user",
            parts : `You act as an interviewer at company **XYZ** based on the resume of client ${resumeInfo} ask 5 question from it.`
          }, {
            role : 'model',
            parts : "Nice to meet you candidate."
          }
        ]
      })
      const msg = `return the question in an const interviewQuestions array`
      var result1 = await chat.sendMessage(msg);
      var x = await result1.response
      var text = x.text()
      const regex = /const interviewQuestions = (\[.*?\]);/s;
      const match = text.match(regex);
      var question = []
      if (match && match[1]) {
        const extractedArray = eval(match[1]);
        question = extractedArray 
      } else {
        console.log("Array extraction failed.");
      }
      res.status(200).json({ questions: question });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/evaluate', async (req, res) => {
  let questions = req.body.questions
  let answer = req.body.userAnswers
  let resume = req.body.imageName
  console.log(questions, answer, resume)
  console.log("EVALUATING!")
  try {
    const imageName = req.body.imageName;
    const imagePath = path.join(__dirname, uploadDirectory, imageName);
    console.log(imagePath);
    var prompt = "Extract information from the resume.";
    const image = {
    inlineData: {
        data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType: "image/png",
    },
    };
  
    const result = await imagemodel.generateContent([prompt, image]);
    var resumeInfo = result.response.text()
    //console.log(resumeInfo)
    var prompt = `based on ${resumeInfo} and ${questions} Generate Model Answers of 2-3 lines. The number of answers should match the number of question. Return the answers in const array modelanswer`
    const modelAns = await model.generateContent([prompt]);
    var modelans = modelAns.response.text()

    var stringans = answer.toString()
    var prompt = `The questions are ${questions.toString()} the Model answer to it are ${modelans}, the answer given by the candidate is ${stringans}. Compare the model answer with the candidate answer and provide feedback for each question assign it a score out of 5. In the end give feedback as hire not hire.`
    var feedback = await model.generateContent([prompt])
    var finalfeedback = feedback.response.text()
    console.log(finalfeedback)
    console.log(modelans)
    res.status(200).json({ feedback: finalfeedback });
  }
  catch(e){
    console.log(e);
  }
})


app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
