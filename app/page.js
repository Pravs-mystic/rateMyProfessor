'use client'
import { Box, Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { FaChalkboardTeacher } from 'react-icons/fa';
import './styles.css'; 

export default function Home() {
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content:
				"Hi, I'm the Rate My Professor Assistant. How May I help you today?",
		},
	]);
	const [message, setMessage] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const chatContainerRef = useRef(null);

	useEffect(() => {
		console.log("use effect messages ", messages)
		if (chatContainerRef.current) {
		  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
		}
	  }, [messages]);

	const sendMessage = async () => {
		const newUserMessage = { role: "user", content: message };
		const newAssistantMessage = { role: "assistant", content: "" };
		setMessages((prevMessages) => [...prevMessages, newUserMessage, newAssistantMessage]);
		setMessage("");
		setIsStreaming(true);

		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify([...messages, newUserMessage]),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		let accumulatedContent = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = decoder.decode(value, { stream: true });
			accumulatedContent += text;

			setMessages((prevMessages) => {
				const updatedMessages = [...prevMessages];
				const lastMessage = updatedMessages[updatedMessages.length - 1];
				lastMessage.content = accumulatedContent;
				return updatedMessages;
			});
		}

		setIsStreaming(false);
	};

	return (
		<Box className="background" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' , justifyContent:"center", alignItems:"center"}}>
		  <Typography variant="h4" className="chat-title" sx={{ pt: 2, textAlign: 'center' }}>
			Rate My Professor <FaChalkboardTeacher style={{ padding: '0 2px' }}/>
		  </Typography>
	
		  <Grid container sx={{ flexGrow: 1 }}>
			<Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
			  <Stack
				className="chat-container"
				direction="column"
				spacing={2}
				sx={{
				  width: '100%',
				  height: '80vh',
				  maxWidth: '600px',
				  borderRadius: 4,
				  p: 3,
				}}
			  >
				<Stack
				  ref={chatContainerRef}
				  direction="column"
				  spacing={2}
				  sx={{
					flexGrow: 1,
					overflow: 'auto',
					maxHeight: 'calc(100% - 70px)', // Adjust based on your input field height
				  }}
				>
				  {messages.map((message, index) => (
					<Box
					  key={index}
					  display="flex"
					  justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
					>
					  <Box
						className={message.role === "assistant" ? "assistant-message" : "user-message"}
						borderRadius={2}
						p={2}
						m={1}
					  >
						<ReactMarkdown>{message.content}</ReactMarkdown>
					  </Box>
					</Box>
				  ))}
				</Stack>
				<Stack direction="row" spacing={2}>
				  <TextField
					label="Message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					variant="outlined"
					fullWidth
					disabled={isStreaming}
					className="transparent-input"
				  />
				  <Button 
					variant="contained" 
					color="primary" 
					onClick={sendMessage}
					className="transparent-button"
				  >
					Send
				  </Button>
				</Stack>
			  </Stack>
			</Grid>
		  </Grid>
		</Box>
	  );
}