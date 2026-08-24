import morgan from 'morgan';export default morgan(process.env.NODE_ENV==='production'?'combined':'dev');
