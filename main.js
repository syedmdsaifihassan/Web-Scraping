let fs = require('fs');
let path = require('path');

// npm i request
let request = require('request');
let cheerio = require('cheerio');
let xlsx = require('xlsx');
// const { clear } = require('console');

// IPL folder
let mainPath = process.cwd();
let iplPath = path.join(mainPath, 'IPL');
if(fs.existsSync(iplPath)){
    console.log("IPL folder already exist");
}else{
    fs.mkdirSync(iplPath);
}

// data extract -> cheerio
// console.log("Before");
let mainURL = "https://www.espncricinfo.com/series/ipl-2020-21-1210595";
request(mainURL, cb);

function cb(error, response, html) {
    if(error) {
        console.log('error:', error); // Print the error message if occured.
    }else if(response.statusCode == 404){
        console.log("Page not found");
    }else{
        // console.log(html); // Print the HTML for the request made
        dataExtract(html);
    }
}

function dataExtract(html) {
    // search tool
    let searchTool = cheerio.load(html);
    // css selector -> elem
    let element = searchTool(".widget-items.cta-link");
    // text
    let moduleName = element.text().trim();
    // console.log("moduleName", moduleName);
    let aElem = searchTool(element).find("a");
    let link = aElem.attr("href");
    // console.log(link);
    // link
    // new page -> link get -> complete -> request
    let viewAllResultLink = `https://www.espncricinfo.com/${link}`;
    // console.log(viewAllResultLink);

    // request on viewAllResultLink (All Match Page)
    request(viewAllResultLink, matchResult);
}

function matchResult(error, response, html) {
    if(error) {
        console.log('error:', error); // Print the error message if occured.
    }else if(response.statusCode == 404){
        console.log("Page not found");
    }else{
        // console.log(html); // Print the HTML for the request made
        getScorecard(html);
    }
}

function getScorecard(html){
    // search tool
    let searchTool = cheerio.load(html);
    let teamName = searchTool('.league-scores-container a[data-hover=Scorecard]');
    // console.log(teamName.length);

    // all Scorecard URL
    for(let i=0; i<teamName.length; i++){
        let scorecardURL = searchTool(teamName[i]).attr("href");
        let scorecardFullLink = `https://www.espncricinfo.com/${scorecardURL}`;
        // console.log(scorecardFullLink);
        request(scorecardFullLink, scoreCard);
    }
}

function scoreCard(error, response, html) {
    if(error) {
        console.log('error:', error); // Print the error message if occured.
    }else if(response.statusCode == 404){
        console.log("Page not found");
    }else{
        // console.log(html); // Print the HTML for the request made
        teamDetails(html);
    }
}

function teamDetails(html) {
    let searchTool = cheerio.load(html);
    let teamNames = searchTool('.match-info-MATCH-half-width .name-detail .name');
    // console.log(teamNames.length);

    // Teams Name with Batsman Name
    let team1 = searchTool(teamNames[0]).text()
    let team2 = searchTool(teamNames[1]).text()

    // console.log("---------------------------------------");
    // console.log(team1+" VERSUS "+team2);
    // console.log("---------------------------------------");

    // Creatig Teams Folder
    let teamPath1 = path.join(iplPath, team1);
    let teamPath2 = path.join(iplPath, team2);
    if(fs.existsSync(teamPath1)) {
        console.log(team1+" already exists");
    }else{
        fs.mkdirSync(teamPath1);
    }
    if(fs.existsSync(teamPath2)) {
        console.log(team2+" already exists");
    }else{
        fs.mkdirSync(teamPath2);
    }

    // Match No., Venue, Date of Match
    let matchStatsArr = searchTool('.match-info-MATCH-half-width .description').text().split(',');
    let matchNo = matchStatsArr[0];
    let matchVenue = matchStatsArr[1];
    let matchDate = matchStatsArr[2];
    // console.log(matchStatsArr[0], matchStatsArr[1], matchStatsArr[2]);

    // Match Result
    let matchResult = searchTool('.match-info-MATCH-half-width .status-text span').text();
    // console.log(matchResult);

    let battingTable1 = searchTool('.table.batsman')[0];
    let battingTable2 = searchTool('.table.batsman')[1];
    // console.log(battingTable.length)
    let playerDetails1 = searchTool(battingTable1).find('tbody tr');
    let playerDetails2 = searchTool(battingTable2).find('tbody tr');

    // console.log("--------------"+team1+"--------------")
    for(let i=0; i<playerDetails1.length-1; i+=2) {
        let playerStatArr = searchTool(playerDetails1[i]).find('td');
        let playerName = searchTool(playerStatArr[0]).text();
        // let playerBold = searchTool(playerStatArr[1]).text();
        let playerRun = searchTool(playerStatArr[2]).text();
        let playerBall = searchTool(playerStatArr[3]).text();
        let playerFours = searchTool(playerStatArr[5]).text();
        let playerSixes = searchTool(playerStatArr[6]).text();
        let playerSR = searchTool(playerStatArr[7]).text();

        let playerObj = {};
        playerObj.myTeamName = team1;
        playerObj.name = playerName;
        playerObj.venue = matchVenue;
        playerObj.date = matchDate;
        playerObj.opponentTeamName = team2;
        playerObj.result = matchResult;
        playerObj.runs = playerRun;
        playerObj.balls = playerBall;
        playerObj.fours = playerFours;
        playerObj.sixes = playerSixes;
        playerObj.sr = playerSR;

        // console.log(playerObj);

        let playerPath = path.join(teamPath1, playerName+'.xlsx');
        let playerArray = [];
        if(fs.existsSync(playerPath)==false) {
            // let contentArr = JSON.parse(fs.readFileSync(playerPath));
            // contentArr.push(playerObj);
            // let JSONString = JSON.stringify(contentArr);
            // fs.writeFileSync(playerPath, JSONString);
            playerArray.push(playerObj);
        }else{
            // let array = [];
            // array.push(playerObj);
            // let JSONString = JSON.stringify(array);
            // fs.writeFileSync(playerPath, JSONString);
            playerArray = excelReader(playerPath, playerName);
            playerArray.push(playerObj);
        }
        excelWriter(playerPath, playerArray, playerName);
    }
    // console.log("--------------"+team2+"--------------")
    for(let i=0; i<playerDetails2.length-1; i+=2) {
        let playerStatArr = searchTool(playerDetails2[i]).find('td');
        let playerName = searchTool(playerStatArr[0]).text();
        // let playerBold = searchTool(playerStatArr[1]).text();
        let playerRun = searchTool(playerStatArr[2]).text();
        let playerBall = searchTool(playerStatArr[3]).text();
        let playerFours = searchTool(playerStatArr[5]).text();
        let playerSixes = searchTool(playerStatArr[6]).text();
        let playerSR = searchTool(playerStatArr[7]).text();

        let playerObj = {};
        playerObj.myTeamName = team2;
        playerObj.name = playerName;
        playerObj.venue = matchVenue;
        playerObj.date = matchDate;
        playerObj.opponentTeamName = team1;
        playerObj.result = matchResult;
        playerObj.runs = playerRun;
        playerObj.balls = playerBall;
        playerObj.fours = playerFours;
        playerObj.sixes = playerSixes;
        playerObj.sr = playerSR;

        // console.log(playerObj);

        let playerPath = path.join(teamPath2, playerName+'.xlsx');
        let playerArray = [];
        if(fs.existsSync(playerPath)==false) {
            // let contentArr = JSON.parse(fs.readFileSync(playerPath));
            // contentArr.push(playerObj);
            // let JSONString = JSON.stringify(contentArr);
            // fs.writeFileSync(playerPath, JSONString);
            playerArray.push(playerObj);
        }else{
            // let array = [];
            // array.push(playerObj);
            // let JSONString = JSON.stringify(array);
            // fs.writeFileSync(playerPath, JSONString);
            playerArray = excelReader(playerPath, playerName);
            playerArray.push(playerObj);
        }
        excelWriter(playerPath, playerArray, playerName);
    }
}

// console.log("After");

function excelWriter(filePath, json, sheetName) {
    // workbook create
    let newWB = xlsx.utils.book_new();
    // worksheet
    let newWS = xlsx.utils.json_to_sheet(json);
    xlsx.utils.book_append_sheet(newWB, newWS, sheetName);
    // excel file create 
    xlsx.writeFile(newWB, filePath);
}
// // json data -> excel format convert
// // -> newwb , ws , sheet name
// // filePath
// read 
//  workbook get
function excelReader(filePath, sheetName) {
    // player workbook
    let wb = xlsx.readFile(filePath);
    // get data from a particular sheet in that wb
    let excelData = wb.Sheets[sheetName];
    // sheet to json 
    let ans = xlsx.utils.sheet_to_json(excelData);
    return ans;
}