# Begin Chapter 1: Introduction to Computer Networks

You are implementing **Chapter 1** of NetBite.

Do NOT build future chapters.

Do NOT implement IP addressing, subnetting, routing, CLI configuration, packet simulation, or validation logic beyond what is required for this chapter.

A protocol-neutral message-path animation may illustrate that connected devices have a path between them. It must be labeled conceptual and must not claim to simulate packets, Ethernet frames, addressing, or switch forwarding.

Stay strictly within the scope below.

---

# Chapter Goal

Teach absolute beginners:

- What a computer network is
- The purpose of connecting devices
- Basic networking devices
- Basic topology interaction
- What a local area network (LAN) is

The objective is for the player to successfully connect devices together and understand their purpose.

No networking configuration is required.

---

# Learning Objectives

By the end of Chapter 1, the player should understand:

- What a computer network is
- The purpose of connecting devices
- What a PC is
- What a Switch is
- What a Router is
- The difference between connected and disconnected devices
- That a home, classroom, or office network is a LAN

Do NOT teach:

- IP addresses
- MAC addresses
- Ethernet Frames
- OSI Model
- CLI
- Routing
- Switching logic
- Packet simulation

These concepts belong to future chapters.

---

# Features to Build

Implement only the following systems.

## 1. Lesson Pages

Create educational lesson pages containing:

- Title
- Short explanation
- Illustration placeholder
- "Next" button

The lessons should cover:

### Lesson 1
What is a Computer Network?

### Lesson 2
Why Networks Exist

### Lesson 3
Meet the Devices

Introduce:

- PC
- Switch
- Router

### Lesson 4
Connecting Devices

Explain how devices are physically connected in a simple network.

---

## 2. Interactive Topology

Allow the player to:

- Place PCs
- Place Switches
- Place Routers
- Drag devices around the canvas
- Connect devices using cables

Validation is intentionally simple.

Only verify:

- Device exists
- Cable exists

Do NOT implement networking logic.

---

## 3. Mini Lab

Create one beginner lab.

### Objective

Connect two PCs to a switch.

### Success Condition

Both PCs are connected to the same switch.

Do NOT require:

- IP configuration
- Packet transmission
- CLI
- Routing

---

## 4. Quiz

Generate five beginner multiple-choice questions.

Examples:

- What is a computer network?
- Which device connects multiple computers together?
- What is the purpose of a router?

---

## 5. Flashcards

Generate flashcards for:

- Computer Network
- PC
- Switch
- Router
- LAN

---

# UI Guidelines

Design for a modern, clean, mobile-first experience.

The interface should be:

- Simple
- Beginner-friendly
- Touch-friendly
- Minimal and uncluttered
- Easy to navigate

Use:

- Large touch targets
- Clear typography
- Consistent spacing
- Friendly educational language

Avoid overwhelming users with long paragraphs.

Each lesson should take approximately 1–2 minutes to complete.

---

# Architecture Requirements

Follow the NetBite architecture document.

Use:

- React Native (Expo)
- TypeScript
- Zustand
- Feature-driven architecture

Do not introduce unnecessary libraries.

Keep all lesson, quiz, flashcard, and lab content data-driven.

---

# Deliverables

Generate:

1. Folder structure for Chapter 1
2. Required React Native screens and components
3. Data models
4. Zustand state additions
5. Lesson content
6. Quiz content
7. Flashcard content
8. Mini Lab definition

Do NOT implement future chapters.

When Chapter 1 is complete, stop and wait for further instructions.

The goal of this chapter is to introduce networking fundamentals through interactive learning, not technical configuration.
