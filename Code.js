/**
 * Student Report System 
 * Made by Anish Neethi Ganesh
 * January 26, 2023
 */ 

// a few global constants to make code easier to follow
const studentCount = 30
const sections = 4
const categories = ['k','t','c','a'];
const template ={
    k:0,
    t:0,
    c:0,
    a:0
  }
/**
 * gateway functions that lead to real logic of the program. Here to adhere to Apps Scripts restrictions.
 */  
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Instructor Tools")
  .addSubMenu(ui.createMenu('Statistics Tools')
    .addItem("Highest Mark", "highestMark")
    .addItem("Lowest Mark", "lowestMark")
    .addItem("Class Average", "classAverage"))
  .addSeparator()
  .addSubMenu(ui.createMenu('Report Tools')
    .addItem("Create Student Report", "studentReport")
    .addItem("Create Student Report and Email Parent", "emailParent")
    .addItem("Create Class Breakdown", "classBreakdown")
    .addItem("Create Class Breakdown and Email Administrator", "emailAdmin"))
    .addToUi();
}

function highestMark(){
  const  marksDriver = new MarksDriver;
  marksDriver.getHighestMark();
}

function classAverage(){
  const  marksDriver = new MarksDriver;
  classAverage = marksDriver.classAverages();
  SpreadsheetApp.getUi().alert(`The weighted class average is ${classAverage[0]} and the raw class average  is ${classAverage[1]}`);
}

function lowestMark(){
  const  marksDriver = new MarksDriver;
  marksDriver.getLowestMark();
}

function classBreakdown(){
  return new ClassBreakdown(new InfoDriver,new MarksDriver);
}

function studentReport(){
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Enter the student's student number").getResponseText();
  return new StudentReport(response,new InfoDriver,new MarksDriver);
}
function emailAdmin(){
  const ui = SpreadsheetApp.getUi();
  const adminEmail = ui.prompt("Enter the Administrators email address").getResponseText();
  const classBreakdown = new ClassBreakdown(new InfoDriver,new MarksDriver);
  const url = classBreakdown.getUrl();
  MailApp.sendEmail({
    to: adminEmail,
    subject: "Class Mark Breakdown",
    htmlBody: `
    <p>Dear highly esteemed Administrator,</p>
      <p>
      <p>

    Please find the url to my Class Mark Breakdown below. Do not worry to much about the few outliers in the very low tier, they will be up with their peers in no time. After all my course is VERY CHALLENGING. 

    <p>
    ${url}
    <p>
    <p>
    Best Wishes,
    <p>
    Mr. Simpson
    `
  })
}

function emailParent(){
  const infoDriver = new InfoDriver
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Enter the student's student number").getResponseText();
  const studentReport = new StudentReport(response,infoDriver,new MarksDriver)
  const url = studentReport.getUrl();
  const parentEmail = infoDriver.idtoEmail(response)
  MailApp.sendEmail({
    to: parentEmail,
    subject: "Student Progress Report",
    htmlBody: `
    <p>Hello respected parent,</p>
      <p>
      <p>
    Please find a url directing you to a report of your childs progress in my super-duper-extremely-interesting, Philosophy of the Modern Family, course :)

    <p>
    ${url}
    <p>
    <p>
    Best Wishes,
    <p>
    Mr. Simpson
    `
  })
}

/**
 * This class is responsible for processing all of the student marks using its many methods
 * There are no parameters for this class
 * @returns {string} The values that have been added together
 */
class MarksDriver {
  constructor(){
    this.portfolio = new Portfolio;
    this.rawAverage = {
      sum: 0,
      count: 0
    };
    this.getMarks();
  }
  /**
   * this aggregates the various values required for further calculations
   */
  getMarks(){
    const allSheets = this.portfolio.allSheets;
    for (let i= 2; i<allSheets.length;i++){
      let sheet = allSheets[i];
      let markRange = sheet.getRange(6,2,30,4).getValues();
      let weightRange = sheet.getRange(2,2,2,4).getValues();
      // sheet [] --> rows [] --> collumns [] below \/
      this.portfolio.unweightedMarks.push(markRange);
      for(let category=0;category<sections;category++){
        // these are pushing in arrays of max and weight into maxs and weights arrays
        this.portfolio.maxs[categories[category]].push(weightRange[0][category]);
        this.portfolio.weights[categories[category]].push(weightRange[1][category]);
        this.portfolio.totalWeights[categories[category]] += weightRange[1][category];
      }
    }
  }

  /**
   * This method gets highest mark and pops an alert
   */
  getHighestMark() {
    let highest = 0;
    let student = '';
    let statement ="";
    for (let index =0; index<studentCount;index++) {//should run 30 times
      let mark = this.getWeightedAverage(index);
      if (mark > highest) {
        highest = mark;
        student = `${this.portfolio.studentInfo[index][0]} ${this.portfolio.studentInfo[index][1]}`;
      }
    }
    if (highest >= 99){
      statement = " Note: Recommend that student 'tries harder"
    }
    SpreadsheetApp.getUi().alert(`The highest scorer is: ${student}, with a mark of ${highest}%.${statement}`);
  }

  getLowestMark() {
    let lowest = 100;
    let student = '';
    let statement ='';
    for (let index =0;index<studentCount;index++) {//should run 30 times
      let mark = this.getWeightedAverage(index);
      if (mark < lowest) {
        lowest = mark;
        student = `${this.portfolio.studentInfo[index][0]} ${this.portfolio.studentInfo[index][1]}`;
      }
    }
    if (lowest < 60){
      statement = " Note: Extra-help is highly recommended for this student"
    }
    SpreadsheetApp.getUi().alert(`The lowest scorer is: ${student}, with a mark of ${lowest}%.${statement}`);
  }

  /**
   * gets weighted average for a given student
   * @param {number} studentIndex - to go straight to correct student in array.
   * @return {number} The result of adding all of the weighted averages by section up and getting their rounded version.
   */
  getWeightedAverage(studentIndex){
    const weightedTotal = {...template};
    const categories = ['k','t','c','a'];
    for(let i= 0; i<this.portfolio.unweightedMarks.length;i++){
        for(let category = 0; category< categories.length;category++){
          let unweighted = this.portfolio.unweightedMarks[i][studentIndex][category];
          let percentage = unweighted/this.portfolio.maxs[categories[category]][i]; // gets the max mark from maxAndWeights
          let weight = this.portfolio.weights[categories[category]][i]/this.portfolio.totalWeights[categories[category]];
          weightedTotal[categories[category]] += percentage*weight;
        }
      }
    const courseWeightTotal = 100;
    const weightedMark = 
    (weightedTotal.k*(this.portfolio.coursesInfo[0]/courseWeightTotal)) +
    (weightedTotal.t*(this.portfolio.coursesInfo[1]/courseWeightTotal)) +
    (weightedTotal.c*(this.portfolio.coursesInfo[2]/courseWeightTotal)) +
    (weightedTotal.a*(this.portfolio.coursesInfo[3]/courseWeightTotal));
    // chose to round with two decimal places for maximum clarity
    return (Math.round((weightedMark*100)*100))/100;
  }
  /**
   * gets raw average for a given student
   * @param {number} studentIndex - to go straight to correct student in array.
   * @return {number} The rounded raw average.
   */
  getRawAverage(studentIndex){
    for(let i= 2; i<this.portfolio.allSheets.length;i++){
      let sheet = this.portfolio.allSheets[i];
      let markRange = sheet.getRange(6,2,30,4).getValues();
      let maxRange = sheet.getRange(2,2,1,4).getValues(); 
      for(let i=0; i<sections;i++){
      this.rawAverage.sum += markRange[studentIndex][i]  
      this.rawAverage.count += maxRange[0][i]
      }
    }
    const rawAverage = this.rawAverage.sum/this.rawAverage.count;
    // do same as weighted here
    return (Math.round(((rawAverage)*100)*100))/100;
  }
  /**
   * compiles an array of assesments for student report table
   * @param {number} studentIndex - to go straight to correct student in array.
   * @return {array} 2D list of assesments. each index is a new assement's array and inside are title and sectional marks.
   */
  assesments(studentIndex){
    this.getMarks();
    let assesments =[];
    let sheetName ="";
    let totalMark = {...template};
    let totalMax = {...template};
    for(let i=2;i< this.portfolio.allSheets.length;i++){
      sheetName = this.portfolio.allSheets[i].getName();
      assesments.push
      ([sheetName,
      `${this.portfolio.unweightedMarks[i-2][studentIndex][0]}/${this.portfolio.maxs.k[i-2]}`,
      `${this.portfolio.unweightedMarks[i-2][studentIndex][1]}/${this.portfolio.maxs.t[i-2]}`,
      `${this.portfolio.unweightedMarks[i-2][studentIndex][2]}/${this.portfolio.maxs.c[i-2]}`,
      `${this.portfolio.unweightedMarks[i-2][studentIndex][3]}/${this.portfolio.maxs.a[i-2]}`]);
    }
    //to get total scores for bottom row of table
    for(let i=0;i< this.portfolio.allSheets.length-2;i++){
      for(let category=0;category<sections;category++){
        totalMark[categories[category]] += this.portfolio.unweightedMarks[i][studentIndex][category];
        totalMax[categories[category]] += this.portfolio.maxs[categories[category]][i];
      }
    }
    //bottom row
    assesments.push
    (['Total',
    `${totalMark.k}/${totalMax.k}`,
    `${totalMark.t}/${totalMax.t}`,
    `${totalMark.c}/${totalMax.c}`,
    `${totalMark.a}/${totalMax.a}`]);
    return assesments;
  }
  /**
   * extra calculation to get class average for graph
   * @return {array} array of weighted and raw averages
   */
  classAverages(){
    //weighted is index [0] and raw is index [1]
    let averages = [0,0];
    for (let index =0; index<studentCount;index++) {//should run 30 times
      averages[0] += this.getWeightedAverage(index);
      averages[1] += this.getRawAverage(index);
      }
    averages[0] = (Math.round((averages[0]/studentCount)*100))/100;
    averages[1] = (Math.round((averages[1]/studentCount)*100))/100;
    return averages;
  }
  /**
   * extra calculation to get worst and best performers for Class Breakdown.
   * @return {array} 2D array of absolute lowest, lowest, and highest performers.
   */
  performanceRanking(){
    //absolute lowest performers are in index [0], lowest are in index [1] and highest are in index [2]
    let rankings = [[],[],[]]
    let classAverage = this.classAverages()[0];
    let student = ""
  for (let index =0;index<studentCount;index++) {//should run 30 times
        let mark = this.getWeightedAverage(index);
        if (mark < 60) {
           student = `${this.portfolio.studentInfo[index][0]} ${this.portfolio.studentInfo[index][1]}`;
          rankings[0].push(`NAME:\n${student}\nMark:\n${mark}`);
        }
        else if (mark < classAverage && mark > 60) {
          student = `${this.portfolio.studentInfo[index][0]} ${this.portfolio.studentInfo[index][1]}`;
          rankings[1].push(`NAME:\n${student}\nMark:\n${mark}`);
        }
        else if (mark >= classAverage) {
          student = `${this.portfolio.studentInfo[index][0]} ${this.portfolio.studentInfo[index][1]}`;
          rankings[2].push(`NAME:\n${student}\nMark:\n${mark}`);
        }
      }
    return rankings
  }
}

  /**
   * Stores a lot of data for MarksDriver.
   */
class Portfolio {
  constructor(){
    this.allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets(); 
    this.maxs = {
      k: [],
      t: [],
      c: [],
      a: [],
    };
    this.weights = {
      k: [],
      t: [],
      c: [],
      a: [],
    };

    this.totalWeights = {...template};
    this.unweightedMarks = [];
    this.studentInfo = this.allSheets[0].getRange(2,1,30,4).getValues(); // later merge instances of this to InfoDriver version somehow?
    this.coursesInfo = this.allSheets[1].getRange(2,2,4).getValues();
  }
}

/**
 * this class stores data and gets student info bits for ReportMaker
 */
class InfoDriver {
  constructor() { 
    this.sheets = SpreadsheetApp.getActive().getSheets();
    this.index =0;
    this.studentInfo = this.sheets[0].getRange(2,1,30,4).getValues();
  }
  
  /**
     * converts an id to an array index
     * @param {number} studentNumber - to use to iterate through all student numbers to find correct index.
     * @return {number} student index.
   */  
  idToIndex(studentNumber){
    let index =0;
    for (let i=0;i<this.studentInfo.length;i++){
      if (`${this.studentInfo[i][2]}` === studentNumber){
        index = i;
      }
    }
    return index;
  }
  /**
     * converts an index to students name
     * @param {number} index - to find correct student.
     * @return {string} students name.
   */ 
  indexToName(index){
    let name = `${this.studentInfo[index][0]} ${this.studentInfo[index][1]}`;
    return name;
  }
  /**
     * converts an id to a parent email
     * @param {number} studentNumber - to use to iterate through all student numbers to find correct email.
     * @return {string} parent email.
   */ 
  idtoEmail(studentNumber){
    let email ="";
    for (let i=0;i<this.studentInfo.length;i++){
      if (`${this.studentInfo[i][2]}` === studentNumber){
        email = this.studentInfo[i][3];
      }
    }
    return email;
  }
}
/**
   * This is an abstract class for creating reports on google docs using data.
   * @param {number} id - to give to InfoDriver methods.
   * @param {class} infoDriver - to create new instance of class for use.
   * @param {class} marksDriver - to create new instance of class for use.
 */ 
class ReportMaker{
  constructor(id,infoDriver, marksDriver){
    this.infoDriver = infoDriver;
    this.marksDriver = marksDriver;
    this.index = this.infoDriver.idToIndex(id);
    this.name = this.infoDriver.indexToName(this.index);
    this.weightedAverage = this.marksDriver.getWeightedAverage(this.index);
    this.rawAverage = this.marksDriver.getRawAverage(this.index);
    this.classAverages = this.marksDriver.classAverages();
    this.rankings = this.marksDriver.performanceRanking();
    this.font = {}
    this.font[DocumentApp.Attribute.FONT_FAMILY] = 'Quattrocento';
  }
  getUrl(){
    throw new Error("You have to implement the method!");  
  }
  heading(){
    throw new Error("You have to implement the method!"); 
  }
  table(){
    throw new Error("You have to implement the method!"); 
  }
  averages(){
    throw new Error("You have to implement the method!"); 
  }
  graph(){
    throw new Error("You have to implement the method!"); 
  }
}

/**
   * creates the student report on google docs using aggregated data.
   * @param {number} id - to give to InfoDriver methods.
   * @param {class} infoDriver - to create new instance of class for use.
   * @param {class} marksDriver - to create new instance of class for use.
 */ 
class StudentReport extends ReportMaker{
  constructor(id,infoDriver, marksDriver){
    super(id,infoDriver,marksDriver);

    this.document = DocumentApp.create(`${this.name} - Student Report`);
    this.body = this.document.getBody();
    this.body.setAttributes(this.font);  
    this.heading();
    this.averages();
    this.table();
    this.graph();
  }
 /**
  * creates the student report on google docs using aggregated data.
  * @return {string} url for email to parent.
  */ 
  getUrl(){
    return this.document.getUrl();
  }
   /**
    * No parameters or return values for classes below. All of them just create different part of the document.
    */ 

  heading(){
    const headerStyle = {}
    headerStyle[DocumentApp.Attribute.FONT_SIZE] = 35;
    headerStyle[DocumentApp.Attribute.BOLD] = true;
    const heading = this.body.insertParagraph(0,`${this.name} - Student Report`);

    heading.setAttributes(headerStyle);
  }
  averages(){
    const averageStyle = {}
    averageStyle[DocumentApp.Attribute.FONT_SIZE] = 25;
    averageStyle[DocumentApp.Attribute.BOLD] = true;
    const weightedAverageText = this.body.appendParagraph(`Weighted Average: ${this.weightedAverage}%`);
    const rawAverageText = this.body.appendParagraph(`Raw Average: ${this.rawAverage}%`);

    weightedAverageText.setAttributes(averageStyle);
    rawAverageText.setAttributes(averageStyle);
  }

  table(){
    const tableFont = {}
    const assesments = this.marksDriver.assesments(this.index);
    tableFont[DocumentApp.Attribute.FONT_SIZE] = 13;
    tableFont[DocumentApp.Attribute.BOLD] = false;

    const cells = [['Assessments','Knowledge','Thinking','Communication','Application']];
    for(let i=0;i<assesments.length;i++){
      cells.push(assesments[i]);
    }
    const table = this.body.appendTable(cells);
    const tableTopRow = table.getRow(0);
    const tableBottomRow = table.getRow(cells.length-1)

    table.setAttributes(tableFont);
    tableFont[DocumentApp.Attribute.BOLD] = true;
    tableBottomRow.setAttributes(tableFont);
    tableTopRow.setAttributes(tableFont);
  }

  graph(){
    const graphStyle = {}
    graphStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    graphStyle[DocumentApp.Attribute.BOLD] = true;  
    graphStyle[DocumentApp.Attribute.ITALIC] = true;  
    const title = this.body.appendParagraph(`\n\n\n\n\n\n${this.name} Vs. Class`);
    title.setAttributes(graphStyle);
    graphStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    graphStyle[DocumentApp.Attribute.BOLD] = false;  

    const chartData = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, "Party")
      .addColumn(Charts.ColumnType.NUMBER, "Weighted Average")
      .addColumn(Charts.ColumnType.NUMBER, "Raw Average")
      .addRow([`${this.name}`,this.weightedAverage,this.rawAverage])
      .addRow([`Class Averages`,this.classAverages[0],this.classAverages[1]]);

    const chart = Charts.newBarChart()
      .setDataTable(chartData)
      .setOption('hAxis.minValue',0)
      .setOption('hAxis.maxValue',100)
      .build();
    this.body.appendImage(chart.getAs('image/png').copyBlob());
  }
}

/**
   * creates the Class Mark Breakdown on google docs using aggregated data.
   * @param {class} infoDriver - to create new instance of class for use.
   * @param {class} marksDriver - to create new instance of class for use.
 */ 
class ClassBreakdown extends ReportMaker{
  constructor(infoDriver, marksDriver){
    super(5602259620642870,infoDriver,marksDriver);

    this.document = DocumentApp.create(`Mr. Simpson - Class Breakdown`);
    this.body = this.document.getBody(); 
    this.body.setAttributes(this.font);

    this.heading();
    this.averages();
    this.table();
    this.graph();
  }
 /**
  * creates the student report on google docs using aggregated data.
  * @return {string} url for email to Admin.
  */ 
  getUrl(){
    return this.document.getUrl();
  }

   /**
    * No parameters or return values for classes below. All of them just create different part of the document.
    */ 

  heading(){
    const headerStyle = {}
    headerStyle[DocumentApp.Attribute.FONT_SIZE] = 35;
    headerStyle[DocumentApp.Attribute.BOLD] = true;
    const heading = this.body.insertParagraph(0,`Mr. Simpson's\nClass Mark Breakdown`);

    heading.setAttributes(headerStyle);
  }
  averages(){
    const averageStyle = {}
    averageStyle[DocumentApp.Attribute.FONT_SIZE] = 25;
    averageStyle[DocumentApp.Attribute.BOLD] = true;
    const weightedAverageText = this.body.appendParagraph(`Class Weighted Average: ${this.classAverages[0]}%`);
    const rawAverageText = this.body.appendParagraph(`Class Raw Average: ${this.classAverages[1]}%`);

    weightedAverageText.setAttributes(averageStyle);
    rawAverageText.setAttributes(averageStyle);
  }

 /**
  * creates table of two rows of worst students and marks
  */ 
  table(){    
    const tableFont = {}
    tableFont[DocumentApp.Attribute.FONT_SIZE] = 18;
    const description = this.body.appendParagraph(`The following students make up the bottom bracket of the class. *Instructors note* (remember to abstract later) Those in the first row may require special attention as their average is below 60% and this course is extremely easy.`);

    description.setAttributes(tableFont);
    tableFont[DocumentApp.Attribute.FONT_SIZE] = 13;
    tableFont[DocumentApp.Attribute.BOLD] = false;
    const cells = [["Very low \n(below 60%)"], ['Low\n(below class average)']];
    for(let i=0;i<2;i++){
      for(let j =0;j<this.rankings[1].length;j++){
        // to avoid undefined
        if(j < this.rankings[i].length){
          cells[i].push(this.rankings[i][j]);
        }
      }
    }
    const table = this.body.appendTable(cells);
    const tableTopRow = table.getRow(0);

    table.setAttributes(tableFont);
    tableFont[DocumentApp.Attribute.BOLD] = true;
    tableTopRow.setAttributes(tableFont);
  }

  graph(){
    const graphStyle = {}
    graphStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    graphStyle[DocumentApp.Attribute.BOLD] = true;  
    graphStyle[DocumentApp.Attribute.ITALIC] = true;  
    const title = this.body.appendParagraph(`\n\n\n\nBreakdown of Student Marks`);
    title.setAttributes(graphStyle);
    graphStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    graphStyle[DocumentApp.Attribute.BOLD] = false;  

    const chartData = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, "Status")
      .addColumn(Charts.ColumnType.NUMBER, "Number of Students")

      .addRow([`Very low Average x <60%`,this.rankings[0].length])
      .addRow([`Low Average 60% < x <Class Avg`,this.rankings[1].length])
      .addRow([`Good Standing x > Class Avg`,this.rankings[2].length]);

    const chart = Charts.newPieChart()
      .setDataTable(chartData)
      .setOption('hAxis.minValue',0)
      .setOption('hAxis.maxValue',30)
      .build();
    this.body.appendImage(chart.getAs('image/png').copyBlob());
  }
}
