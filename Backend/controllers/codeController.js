const jwt = require("jsonwebtoken");
const { generateFile } = require("./generateFile");
const { executeCpp } = require("./executecpp");
const { executePython } = require("./executePython");
const { executeJavaScript } = require("./executeJavaScript");
const { executeJava } = require("./executeJava");
const fs = require("fs");
const path = require("path");
const TestCase = require("../models/testCases");
const { generateInputFile } = require("./generateInputFiles");
const {generateInput}= require("./generateInput");
const { AI_Service } = require("../service/AI_Service");
const Problem= require("../models/problems");
const Solution = require("../models/solution");

exports.runCode = async (req, res) => {
  const { code, lang = "c++", problemId, input } = req.body;
  console.log("input in backend", input);
  const testCases = await TestCase.find({ problemId: problemId });
  if (!testCases) {
    testCases = [];
  }
  if (!code) {
    res.status(400).json({message:"Code is required"});
    return;
  }
  const authHeader=req.headers.authorization;

  if(!authHeader){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const token=authHeader.split(" ")[1];
  if(!token){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  if(!id){
    res.status(401).json({message:"Unauthorized"});
    return;
  }
  let output;
  try{
    let filePath;
    if(lang==="java"){
      const {className}=req.body;
      if(!className){
        res.json({message:"Class name is required"});
        return;
      }
       filePath=generateFile(code,lang,className);
    }
    else{
      filePath=generateFile(code,lang);
    }
    
    const inputFilePath=generateInputFile(input);

    if(lang==="cpp"){
       output=await executeCpp(filePath ,inputFilePath);
    }
    else if(lang=="py"){
      output=await executePython(filePath,  inputFilePath); 
    }
    else if(lang=="java"){
      output=await executeJava(filePath,  inputFilePath);
    }
    else if(lang=="js"){
      output=await executeJavaScript(filePath,  inputFilePath);
    }
    if(output && output.error){
      res.status(200).json({output:output.error||output.stderr});
      return;
    }
    res.json({
      message:"Code ran successfully",
      output:output
    });
  }
  catch(err){
    console.log(err);
    res.status(500).json({ message:"Internal server error"});
    return;
  }

}


exports.submitCode=async(req,res)=>{
  const { code, lang="c++" ,problemId} = req.body;
  const testCases=await TestCase.find({problemId:problemId});
  if(!testCases){
    testCases=[];
  }
  if(!code ){
    res.status(400).json({message:"Code is required"});
    return;
  }
  const authHeader=req.headers.authorization;

  if(!authHeader){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const token=authHeader.split(" ")[1];
  if(!token){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  if(!id){
    res.status(401).json({message:"Unauthorized"});
    return;
  }
  let output;
  try{
    let filePath;
    if(lang==="java"){
      const {className}=req.body;
      if(!className){
        res.json({message:"Class name is required"});
        return;
      }
       filePath=generateFile(code,lang,className);
    }
    else{
      filePath=generateFile(code,lang);
    }

    let result = [];
    for (const tc of testCases) {
      const inputFilePath = generateInput(tc.input);

      if (lang === "cpp") {
        output = await executeCpp(filePath, inputFilePath);
      } else if (lang == "py") {
        output = await executePython(filePath, inputFilePath);
      } else if (lang == "java") {
        output = await executeJava(filePath, inputFilePath);
      } else if (lang == "js") {
        output = await executeJavaScript(filePath, inputFilePath);
      }
     
        result.push({
          id: tc._id,
          output: output,
          correct: String(output).trim() === String(tc.output).trim()
        });

    }

    try{
      let c=0;
      let t=0;
      for(const res of result){
        if(!res.correct){
          c++;
        }
        t++;
      }
      const problem=await Problem.findById(problemId);
      if(!problem){
        res.status(404).json({message:"Problem not found"});
        return;
      }
      if(c==0){
        const solution=  new Solution({
          problemId:problemId,
          userId:id,
          code:code,
          titleName:problem.title,
          status:"Accepted",
          submittedAt: new Date()
        })
        await solution.save();
        console.log("Solution saved successfully");
      }
      else{
        const solution=  new Solution({
          problemId:problemId,
          userId:id,
          code:code,
          titleName:problem.title,
          status:"Wrong Answer",
          submittedAt: new Date()
        })
        await solution.save();
        console.log("Solution saved with wrong answer");
      }
    }
    catch(err){
      console.log("Error saving solution:", err);
      res.status(500).json({message: "Internal server error , unable to save solution"});
      return;
    }
    res.status(200).json({
      message: "Code submitted Successfully",
      output: result
    })
  }
  catch(err){
    console.log(err);
    res.status(500).json({message: "Internal server error"});
  }

}

exports.aiReviewCode=async(req,res)=>{

  const {code,problemId} = req.body;
  console.log("code in ai review", code);
  console.log("problemId in ai review", problemId);
  const authHeader=req.headers.authorization;
  if(!authHeader){
    res.status(401).json({message:"Unauthorized"});
    return;
  }
  const token=authHeader.split(" ")[1];
  if(!token){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  if(!id){
    res.status(401).json({message:"Unauthorized"});
    return;
  }

  const problem=await Problem.findById(problemId);
  if(!problem){
    res.status(404).json({message:"Problem not found"});
    return;
  }

  try{
    
    const response = await AI_Service(code,problem);
    if(response.error){
      res.status(500).json({
        message: "Error in AI Review",
        error: response.error
      });
      return;
    }

    res.status(200).json({
      message: "AI Review generated successfully",
      output:response
    });
    
  }
  catch(err){
    console.log(err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    })
  }  
}