const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Cognito = require('aws-cognito-ops');
const Report = require('../classes/Report');
const serverConfig = require('../server-config.json');

// GET /
router.get('/:year/:month/:promoNum?', asyncHandler(async (req, res, next) => {
  let accessToken = await Cognito.checkToken(req, res);
  if (!accessToken) { return res.redirect(`${serverConfig.ContextPath}/auth`); }

  let site = req.query.site;
  
  // if site parameter is not a valid site key or not provided, set it to cas
  //
  if (typeof site === "undefined" || ["cas", "ci", "ti"].filter(item => item === site).length === 0) { site = "cas"; }

  let resData = {}, data, tableData, reqBody = { site: site }, error=false, groupBy;
  let quarters = ["Q1", "Q2", "Q3", "Q4"];
  let months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ]; 
           
  let monthsShort = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];   

  if(req.params.year){
    reqBody.year = parseInt(req.params.year);
  }

  if(req.params.month){
    reqBody.month = parseInt(req.params.month);
  }

  if(req.params.promoNum){
    reqBody.promoNum = parseInt(req.params.promoNum);
  }

  if(req.query.groupBy){
    groupBy = req.query.groupBy;
    reqBody.groupBy = groupBy;
    if(groupBy == 'segment'){
      reqBody.showVariate = req.query.showVariate? req.query.showVariate : 0;
    }
  }

  data = await Report.getCampaignData(reqBody, accessToken).catch(err => {
    error=true;
    return err;
  });

  if(data) {
    if(error){
      resData = {
        meta_title: 'Script Error',
        body_content: 'error',
        error: data 
      }
    }
    
    tableData = data.result;

    if(tableData.length > 0) {
      if(groupBy == 'monthly'){
        tableData = data.result.map(function(el) {
          var column = Object.assign({}, el);
          column.name = months[el.month-1];
          return column;
        })
      }

      if(groupBy == 'quarterly'){
        tableData = data.result.map(function(el) {
          var column = Object.assign({}, el);
          column.name = el.year.toString() + ' ' + quarters[el.quarter-1];
          return column;
        })
      }

      if(groupBy == 'campaign'){
        tableData = data.result.map(function(el) {
          var column = Object.assign({}, el);
          column.name = monthsShort[el.month-1]+' Promo '+el.promo_num;
          return column;
        })
      }

      if(groupBy == 'segment') {
        tableData = data.result.map(function(el) {
          var column = Object.assign({}, el);
          column.name = monthsShort[el.month-1]+el.promo_num+' - '+el.segment.toUpperCase().replace(/_/g, ' ');
          return column;
        })
      }
    }
    resData = {
      meta_title: `Campaign Report for ${site.toUpperCase()}`,
      body_content: 'campaign-data',
      data: (tableData.length > 0) ? JSON.stringify(tableData) : 0,
      tableId: groupBy+'ReportTable'
    }
  } 
  res.render('layout/defaultView', { ...resData, contextPath: serverConfig.ContextPath });
}));

module.exports = router;