const express=require("express");

const problemRouter=express.Router();

const {getProblems}=require("../controllers/problemController");
const {addTestCases}=require("../controllers/problemController");
const {getTestCases}=require("../controllers/problemController");
const { removeTestCase } = require("../controllers/problemController");
const { addProblems } = require("../controllers/problemController"); 
const {addSingleProblem} = require("../controllers/problemController");
const {deleteAllTestCases} = require("../controllers/problemController");
const {deleteAllProblems} = require("../controllers/problemController");

problemRouter.get("/getAllProblems",getProblems);
problemRouter.post("/addTestCases",addTestCases);
problemRouter.post("/addProblems",addProblems);
problemRouter.get("/getAllTestCases",getTestCases);
problemRouter.delete("/removeTestCases/:id", removeTestCase);
problemRouter.delete("/removeAllTestCases", deleteAllTestCases);
problemRouter.delete("/removeAllProblems", deleteAllProblems);
problemRouter.post("/add", addSingleProblem);

module.exports=problemRouter;