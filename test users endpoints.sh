# Get all users
curl http://localhost:3000/api/users

# Get a single user
curl http://localhost:3000/api/users/1

# Create a new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "age": 30, "email": "john@example.com"}'

# Update a user
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Smith", "age": 31}'

# Delete a user
curl -X DELETE http://localhost:3000/api/users/1
