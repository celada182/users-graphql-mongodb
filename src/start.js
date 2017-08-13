import {MongoClient, ObjectId} from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import {graphqlExpress, graphiqlExpress} from 'graphql-server-express'
import {makeExecutableSchema} from 'graphql-tools'
import cors from 'cors'

const URL = 'http://localhost'
const PORT = 3001
const MONGO_URL = 'mongodb://localhost:27017/local'

const prepare = (o) => {
  o._id = o._id.toString()
  return o
}

export const start = async () => {
  try {
    const db = await MongoClient.connect(MONGO_URL)

    const Users = db.collection('users')

    const typeDefs = [`
      type Query {
        user(_id: String): User
        users: [User]
      }

      type User {
        _id: String
        name: String
        password: String
      }

      type Mutation {
        createUser(name: String, password: String): User
      }

      schema {
        query: Query
        mutation: Mutation
      }
    `];

    const resolvers = {
      Query: {
        user: async (root, {_id}) => {
          return prepare(await Users.findOne(ObjectId(_id)))
        },
        users: async () => {
          return (await Users.find({}).toArray()).map(prepare)
        }
      },
      Mutation: {
        createUser: async (root, args, context, info) => {
          const res = await Users.insertOne(args)
          return prepare(await Users.findOne({_id: res.insertedIds[1]}))
        }
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    const app = express()

    app.use(cors())

    app.use('/api', bodyParser.json(), graphqlExpress({schema}))

    app.use('/api', graphiqlExpress({
      endpointURL: '/api'
    }))

    app.listen(PORT, () => {
      console.log(`Visit ${URL}:${PORT}`)
    })

  } catch (e) {
    console.log(e)
  }

}
