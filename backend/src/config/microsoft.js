import { ConfidentialClientApplication } from '@azure/msal-node';
const configured=()=>Boolean(process.env.AZURE_CLIENT_ID&&process.env.AZURE_CLIENT_SECRET&&process.env.AZURE_TENANT_ID);
export const microsoftConfigured=configured;
export const getMicrosoftClient=()=>{if(!configured())return null;return new ConfidentialClientApplication({auth:{clientId:process.env.AZURE_CLIENT_ID,clientSecret:process.env.AZURE_CLIENT_SECRET,authority:`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`}})};
export const scopes=['openid','profile','email','User.Read'];
