import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "socially", brokers: ["localhost:9092"] });
const producer = kafka.producer();

export async function publishEvent(topic, payload) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
}
