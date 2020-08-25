const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = '12345'

const hashedPass = bcrypt.hashSync(myPlaintextPassword, saltRounds);

console.log(hashedPass)