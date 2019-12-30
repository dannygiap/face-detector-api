const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs')
const clarifai = require('clarifai')

const clarifaiApp = new Clarifai.App({
 apiKey: 'c435c765d9364abeb0c454f42723a4ba'
});

const db = knex({
	client: 'pg',
  	connection: {
    host : '127.0.0.1',
    user : '',
    password : '',
    database : 'facedetector'
  }
});

const app = express();
app.use(express.json());
app.use(cors())

app.get('/', (req, res) => {
	res.send('this get request at root is working')
})

app.post('/signin', (req, res) => {
	const {email, password} = req.body;
	if(!email || !password){
		return res.status(400).json('invalid form submission')
	}
	db.select('email', 'hash').from('login')
	.where('email', '=', email)
	.then(data => {
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if(isValid){
			return db.select('*').from('users')
			.where('email', '=', email)
			.then(user => {
				res.json(user[0])
			})
			.catch(err => res.status(400).json('unable to get user'))
		} else{
			res.status(400).json('wrong username or password')
		}
	})
	.catch(err => res.status(400).json('wrong username or password'))
})

app.post('/register', (req, res) => {
	const { name, email, password} = req.body;
	if(!name || !email || !password){
		return res.status(400).json('invalid form submission')
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				name: name,
				email: loginEmail[0],
				joined: new Date
			})
			.then(user => res.json(user[0]))
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err => res.status(400).json('error registering'))
})

app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	db.select('*').from('users').where({id:id})
	.then(user => {
		if(user.length){
			res.json(user[0])
		} else{
			res.status(400).json('user not found')
		}
	})
	.catch(err => res.status(400).json('error finding user'))
})

app.put('/image', (req, res) => {
	const { id } = req.body;
	db('users').where({id:id}).increment('entries', 1)
	.returning('entries')
	.then(entries => res.json(entries))
	.catch(err => res.status(400).json('unable to find entry count'))
})

app.post('/imageurl', (req, res) =>{
	clarifaiApp.models
	.predict("a403429f2ddf4b49b307e318f00e528b", req.body.input)
	.then(data => res.json(data))
	.catch(err => res.status(400).json('unable to work with api'))
})

app.listen(3000, () => {
	console.log('this is running on port 3000')
})

/*

/ -> res = 'this is working'
/siginin -> POST -> success/fail
/register -> POST -> user
/profile/:id -> GET -> user
/image -> PUT -> updates

*/