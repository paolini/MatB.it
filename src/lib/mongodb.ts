import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/matbit?directConnection=true"

async function connect() {  
    console.log(`connecting to mongodb MONGODB_URI=${MONGODB_URI}...`)
  
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
  
    console.log(`...connected`)
    
    return client
  }
  
const clientPromise = connect()

export default clientPromise
