export default {origin:(origin,cb)=>{const allowed=(process.env.FRONTEND_URL||'http://localhost:6001').split(',').map(x=>x.trim());cb(null,!origin||allowed.includes(origin))},credentials:true};
