import bcrypt from 'bcryptjs'

const password = process.argv[2] || 'The_luxem@n2.0'
const hash = bcrypt.hashSync(password, 12)
console.log('Password:', password)
console.log('Hash:', hash)
