import { useEffect, useState } from "react"
import {
  Container,
  Row,
  Col,
  Form,
  FormControl,
  ListGroup,
  Button,
} from "react-bootstrap"

import { io } from "socket.io-client"
import { Message, User } from "../types"

// 1) Every time we refresh the page, the clients connect to the server
// 2) If this connection established correctly, the server will EMIT to us a special event
// 3) If we want to "react" to that event --> we shall LISTEN to that by using socket.on("event")
// 4) Once that this "welcome" event is received by the client --> submit username
// 5) We submit our username to the server by emitting an event called "setUsername"
// 6) Server listens for it, and it sends us the list of connected users by emitting an event called "loggedin"
// 7) On the client side finally we can listen for the "loggedin" event, which is communicating the list of connected users
// 8) This enables us to display in the page the list of connected users
// 9) Let's now set up an event listener for the "newConnection" event, this event is emitted by the server anytime a new user connects to it
// 10) Sending a message should be displayed on the chat history of the sender as well as emitting an event named "sendMessage"

const socket = io("http://localhost:3001", { transports: ["websocket"] }) // if you don't specify websocket here, socketio will try to use Polling (old technique) which is going to give you CORS troubles

const Home = () => {
  const [username, setUsername] = useState("")
  const [messageText, setMessageText] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [chatHistory, setChatHistory] = useState<Message[]>([])

  useEffect(() => {
    // this code will be executed only once!
    // we need to set up the event listeners just once!
    socket.on("welcome", welcomeMessage => {
      console.log(welcomeMessage)
      socket.on("loggedin", onlineUsersList => {
        console.log(onlineUsersList)
        setLoggedIn(true)
        setOnlineUsers(onlineUsersList)

        socket.on("newConnection", onlineUsersList => {
          //server emits this event when a new user connects
          console.log("a new user just connected!")
          setOnlineUsers(onlineUsersList)
        })

        socket.on("newMessage", receivedMessage => {
          console.log(receivedMessage)
          // setChatHistory([...chatHistory, receivedMessage.message])
          // if we are setting the state just by passing a value the message is being appended to an empty chatHistory (which is the initial state of the component)
          // we can fix this by using another version (overload) of the setState function
          // if we pass a callback function to the setState this will give us the up-to-date chatHistory value
          setChatHistory(chatHistory => [
            ...chatHistory,
            receivedMessage.message,
          ])
        })
      })
    })
  })

  const handleUsernameSubmit = () => {
    // here we are sending the username to the server by EMITTING an event of type "setUsername" since this is the name of the event the server is already listening for
    socket.emit("setUsername", { username })
    // after sending username to the server, if everything goes well the server will emit us back another event
    // this event is called "loggedIn" <-- this concludes the login process and puts us in the online users list
    // with the "loggedIn" event the server will communicate the list of the current connected users
  }

  const sendMessage = () => {
    const newMessage: Message = {
      text: messageText,
      sender: username,
      createdAt: new Date().toLocaleString("en-US"),
    }
    socket.emit("sendmessage", { message: newMessage })
    // server will receive this event containing the message, when this happens the server will broadcast another event containing this message to everybody but the sender
    setChatHistory([...chatHistory, newMessage])
  }

  return (
    <Container fluid>
      <Row style={{ height: "95vh" }} className="my-3">
        <Col md={9} className="d-flex flex-column justify-content-between">
          {/* LEFT COLUMN */}
          {/* TOP AREA: USERNAME INPUT FIELD */}
          {/* {!loggedIn && ( */}
          <Form
            onSubmit={e => {
              e.preventDefault()
              handleUsernameSubmit()
            }}
          >
            <FormControl
              placeholder="Set your username here"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loggedIn}
            />
          </Form>
          {/* )} */}
          {/* MIDDLE AREA: CHAT HISTORY */}
          <ListGroup>
            {chatHistory.map((message, index) => (
              <ListGroup.Item key={index}>
                <strong>{message.sender}</strong> | {message.text} at{" "}
                {message.createdAt}
              </ListGroup.Item>
            ))}
          </ListGroup>
          {/* BOTTOM AREA: NEW MESSAGE */}
          <Form
            onSubmit={e => {
              e.preventDefault()
              sendMessage()
            }}
          >
            <FormControl
              placeholder="Write your message here"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              disabled={!loggedIn}
            />
          </Form>
        </Col>
        <Col md={3}>
          {/* ONLINE USERS SECTION */}
          <div className="mb-3">Connected users:</div>
          {onlineUsers.length === 0 && (
            <ListGroup.Item>Log in to see who is online!</ListGroup.Item>
          )}
          <ListGroup>
            {onlineUsers.map(user => (
              <ListGroup.Item key={user.socketId}>
                {user.username}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
