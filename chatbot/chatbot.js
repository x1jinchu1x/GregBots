'use strict'
const dialogflow = require('dialogflow');
const config = require('../config/keys');
const structjson = require('structjson');
const mongoose = require('mongoose');

const googleAuth = require('google-oauth-jwt');

//Code from original version on Udemy, obsolete: 
//const sessionClient = new dialogflow.SessionsClient();   - variable defined below
//const sessionPath = sessionClient.sessionPath(config.googleProjectID, config.dialogFlowSessionID);
 
const projectId = config.googleProjectID;       
const sessionId = config.dialogFlowSessionID;
 
//Code from original version on Udemy, obsolete: 
//const languageCode = config.dialogFlowSessionLanguageCode;
 
const credentials = {
    client_email: config.googleClientEmail,
    private_key:
        config.googlePrivateKey,
};


const sessionClient = new dialogflow.SessionsClient({ projectId, credentials });
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

const Registration = mongoose.model('registration');

module.exports = {

    getToken: async function(){
        return new Promise((resolve) => {
            googleAuth.authenticate({
                email: config.googleClientEmail,
                key: config.googlePrivateKey,
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            },
            (err, token) => {
                resolve(token);
            },
            );
        });
    },



    textQuery: async function(text, userID, parameters = {}) {
        let sessionPath = sessionClient.sessionPath(projectId, sessionId + userID);
        let self = module.exports;
        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    // The query to send to the dialogflow agent
                    text: text,
                    // The language used by the client (en-US)
                    languageCode: config.dialogFlowSessionLanguageCode,
                },
            },
            queryParams: {
                payload: {
                    data: parameters
                }
            }
        };
        let responses = await sessionClient.detectIntent(request);
        responses = await self.handleAction(responses)
        return responses;
    },

    eventQuery: async function(event, userID, parameters = {}) {
        let sessionPath = sessionClient.sessionPath(projectId, sessionId + userID);
        let self = module.exports;

        const request = {
            session: sessionPath,
            queryInput: {
                event: {
                    // The query to send to the dialogflow agent
                    name: event,
                    parameters: structjson.jsonToStructProto(parameters),
                    // The language used by the client (en-US)
                    languageCode: config.dialogFlowSessionLanguageCode,
                },
            }
        };
        let responses = await sessionClient.detectIntent(request);
        responses = await self.handleAction(responses)
        return responses;
    },

    handleAction: function(responses){
        let self = module.exports;
        let queryResult = responses[0].queryResult;

        switch (queryResult.action) {
            case 'recommendcourses-yes':
                if (queryResult.allRequiredParamsPresent) {
                    self.saveRegistration(queryResult.parameters.fields);
                }

                break;
        }

        return responses;
    },

    saveRegistration: async function(fields){
        const registration = new Registration({
            name: fields.name.stringValue,
            address: fields.address.stringValue,
            phone: fields.phone.stringValue,
            email: fields.email.stringValue,
            dateSent: Date.now()
        });
        try{
            let reg = await registration.save();
            console.log(reg);
        }
        catch (err){
            console.log(err);
        }
    }
}