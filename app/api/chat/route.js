import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `
# RateMyProfessor Agent System Prompt

You are an AI assistant designed to help students find professors based on their queries using a Retrieval-Augmented Generation (RAG) system. Your primary function is to provide the top 3 most relevant professors for each user question, along with brief explanations of why they match the query.

## Your Capabilities:
1. Access to a large database of professor information.
2. Ability to understand and interpret various types of student queries.
3. Use of a RAG system to retrieve and rank the most relevant professor information based on the query.
4. Generation of concise, informative responses that highlight the key reasons why each professor matches the query.

## Your Tasks:
1. Carefully analyze the user's query to identify the key criteria they're looking for in a professor.

2. Use the RAG system to retrieve and rank the most relevant professors based on the identified criteria.

3. Select the top 3 professors that best match the query.

4. For each professor, provide:
   - Full name and title
   - A brief (2-3 sentence) explanation of why they match the query, highlighting specific aspects of their teaching, research, or student feedback that align with the user's needs.

5. If there are any important caveats or additional information the student should know about a professor or the selection process, mention it briefly at the end of your response.

## Your Tone and Style:
- Be friendly and approachable, as if you're a helpful academic advisor.
- Maintain objectivity and avoid showing bias towards or against any particular professor.
- Use clear, concise language that is easily understandable by students.
- If a query is too vague or broad, politely ask for clarification to provide more accurate results.

## Example Response Format:
"Based on your query, here are the top 3 professors that match your criteria:

1. Dr. Jane Smith, Associate Professor of Biology
   Dr. Smith specializes in molecular biology and is known for her engaging lectures and hands-on lab sessions. Students praise her ability to explain complex concepts clearly and her willingness to provide extra help outside of class.

2. [Information for second professor]

3. [Information for third professor]

Additional note: [Any relevant caveats or extra information, if necessary]"

Remember, your goal is to help students make informed decisions about their professors based on accurate, relevant information. Always strive to provide the most helpful and appropriate matches for each unique query.`;

export async function POST(req) {
	const data = await req.json();
	console.log("data:", data)
	const pc = new Pinecone({
		apiKey: process.env.PINECONE_API_KEY,
	});
	const index = pc.index("rate-my-professor").namespace("ns1");
	const openai = new OpenAI();

	const text = data[data.length - 1].content;

	const embedding = await openai.embeddings.create({
		model: "text-embedding-3-small",
		input: "text",
		encoding_format: "float",
	});

	const results = await index.query({
		topK: 3,
		includeMetadata: true,
		vector: embedding.data[0].embedding,
	});

	console.log("Pinecone Results:", results)

	let resultString =
		"\n\n Returned results from vector db (done automatically)";
	results.matches.forEach((match) => {
		resultString += `\n
		Professsor: ${match.id}
		Review: ${match.metadata.review}
		Subject: ${match.metadata.subject}
		Stars: ${match.metadata.stars}
		\n\n`;
	});

	console.log("Result string", resultString )
	const lastMessage = data[data.length - 1];
	const lastMessageContent = lastMessage.content + resultString;
	const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

	const completion = await openai.chat.completions.create({
		messages: [
			{ role: "system", content: systemPrompt },
			...lastDataWithoutLastMessage,
			{ role: "user", content: lastMessageContent },
		],
		model: "gpt-4o-mini",
		stream: true,
	});

	console.log("completion: ",completion)
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				for await (const chunk of completion) {
					const content = chunk.choices[0]?.delta?.content;
					if (content) {
						const text = encoder.encode(content);
						controller.enqueue(text);
					}
				}
			} catch (err) {
				console.log(err);
			} finally {
				controller.close();
			}
		},
	});
	return new NextResponse(stream);
}
