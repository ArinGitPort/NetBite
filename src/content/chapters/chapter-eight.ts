import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterEight = createAdvancedChapter({
  id: 8, title: 'ICMP and Ping', summary: 'Use Echo results as evidence and troubleshoot dependencies in a disciplined order.',
  lessons: [
    {
      id: 'icmp-role', title: 'ICMP carries IP control information', illustration: 'icmp-role',
      body: 'Internet Control Message Protocol works alongside IP to report certain network conditions and support diagnostics. It is an Internet-layer protocol, not an application transport protocol and not a tool that repairs a failed path.',
      sections: [
        { heading: 'Messages about delivery', body: 'ICMP includes informational and error-reporting messages. NetBite focuses on Echo Request and Echo Reply; detailed ICMP types remain outside scope.' },
        { heading: 'The tool and protocol differ', body: 'Ping is a diagnostic tool that commonly uses ICMP Echo. ICMP itself is the protocol carrying those messages.' },
      ],
      example: { label: 'CONTROL MESSAGE', setup: 'A host runs ping toward another IPv4 address.', result: 'The tool sends ICMP Echo messages inside IP datagrams and interprets any responses.' },
      takeaway: 'ICMP supports IP control and diagnostics; ping is one tool that uses it.',
    },
    {
      id: 'echo-request-reply', title: 'Echo uses a request and a reply', illustration: 'echo-exchange',
      body: 'The source sends an ICMP Echo Request to a destination IPv4 address. A destination that receives and accepts the request can return an Echo Reply toward the source, producing a round-trip exchange.',
      sections: [
        { heading: 'Both directions matter', body: 'The request needs a forward path, and the reply needs a return path. Receiving the reply is therefore stronger evidence than seeing only the request leave.' },
        { heading: 'Each test is a moment', body: 'A successful exchange describes reachability for that source, destination, and time. It does not promise that the network can never change.' },
      ],
      example: { label: 'ROUND TRIP', setup: 'PC A sends Echo Request to PC B.', result: 'PC B returns Echo Reply; PC A records a completed round trip.' },
      takeaway: 'Ping succeeds when an Echo Request reaches the destination and an Echo Reply returns.',
    },
    {
      id: 'ping-outcomes', title: 'Read a result before explaining it', illustration: 'ping-outcomes',
      body: 'A ping tool may report replies, timeouts, or an ICMP error such as an unreachable condition. These observations are evidence, but their wording and detail vary by operating system and device.',
      sections: [
        { heading: 'Reply', body: 'A reply means this Echo exchange completed. Recorded round-trip time describes the test, not guaranteed application performance.' },
        { heading: 'No reply or error', body: 'A timeout means the tool did not receive the expected reply in time. An explicit ICMP error can identify where a device reported a condition, but still needs context.' },
      ],
      example: { label: 'OBSERVE FIRST', setup: 'Five Echo Requests produce four replies and one timeout.', steps: [
        { id: 'facts', label: 'RECORD THE OBSERVATION', explanation: 'Four requests completed a round trip; one did not produce a reply before the tool’s limit.' },
        { id: 'proof', label: 'STATE WHAT IS SUPPORTED', explanation: 'At least some round-trip IP communication succeeded.' },
        { id: 'unknown', label: 'KEEP CAUSES OPEN', explanation: 'The single timeout alone does not distinguish loss, congestion, filtering, or endpoint behavior.' },
      ], result: 'Report the mixed result first, then gather more evidence before assigning a cause.' },
      takeaway: 'Describe the observed Echo outcome before assigning a cause.',
    },
    {
      id: 'ping-success-boundary', title: 'A successful ping proves something limited', illustration: 'ping-boundary',
      body: 'Receiving an Echo Reply supports round-trip IPv4 reachability between the tested source and destination for that exchange. It also shows that the involved devices allowed the necessary Echo traffic at that moment.',
      sections: [
        { heading: 'What it does not prove', body: 'Ping does not prove that every application service is running, every port is open, name resolution works, or future traffic will always succeed.' },
        { heading: 'Test the relevant source', body: 'Different source interfaces can use different routes and policies. A router-sourced ping may test a different path than a user PC.' },
      ],
      example: { label: 'PING WORKS / WEBSITE FAILS', setup: 'A server replies to Echo, but its web application is stopped.', result: 'IP reachability exists for ping; the application still needs separate investigation.' },
      takeaway: 'Ping success is evidence of one round-trip IP test, not proof of every networked service.',
      checkpoint: { prompt: 'A server replies to ping. What is justified?', correctChoiceId: 'reach', choices: [
        { id: 'reach', label: 'ROUND-TRIP IP REACHABILITY WORKED', feedback: 'Correct. That is the evidence supplied by the Echo exchange.' },
        { id: 'apps', label: 'EVERY APPLICATION IS HEALTHY', feedback: 'Ping does not test every application or service port.' },
        { id: 'forever', label: 'THE PATH CAN NEVER FAIL', feedback: 'The result describes this test, not all future conditions.' },
      ] },
    },
    {
      id: 'ping-failure-boundary', title: 'A failed ping does not name one cause', illustration: 'ping-failure',
      body: 'No Echo Reply can result from many conditions: missing physical link, incorrect address or prefix, unusable gateway, missing route, unavailable destination, congestion, or a policy that filters ICMP.',
      sections: [
        { heading: 'Avoid single-cause claims', body: 'A timeout alone does not prove a broken cable or powered-off host. It says the expected reply was not observed within the tool’s limit.' },
        { heading: 'Use narrower tests', body: 'Testing local link, local address, gateway, and progressively farther destinations turns one broad failure into smaller questions.' },
      ],
      example: { label: 'FILTERED ECHO', setup: 'A firewall blocks ICMP Echo while allowing a web service.', result: 'Ping fails even though some application traffic can still work.' },
      takeaway: 'Ping failure is a symptom that requires dependency checks, not a complete diagnosis.',
    },
    {
      id: 'checkpoint-troubleshooting', title: 'Check dependencies from near to far', illustration: 'diagnostic-path',
      body: 'Troubleshooting is clearer when checks follow the traffic’s dependencies. Begin with the local physical link, then verify host addressing, then test the local gateway for remote traffic before investigating routes and the remote endpoint.',
      sections: [
        { heading: 'Fix the earliest failure', body: 'If the local link is down, a remote-route investigation cannot make the frame leave the PC. Resolve the first failed prerequisite, then test again.' },
        { heading: 'Use a checkpoint path', body: 'Link → local configuration → local peer or gateway → remote path → destination or filtering. Each successful checkpoint narrows the remaining possibilities.' },
      ],
      example: { label: 'REMOTE PING FAILS', setup: 'A remote ping fails. The local link is up, but the configured gateway is outside the host’s subnet.', steps: [
        { id: 'link', label: 'CHECK THE LOCAL LINK', explanation: 'Link is established, so continue upward.' },
        { id: 'address', label: 'CHECK HOST ADDRESSING', explanation: 'The host address and prefix form a valid local identity.' },
        { id: 'gateway', label: 'CHECK THE NEXT HOP', explanation: 'The off-subnet gateway cannot be reached directly.', value: 'FIRST KNOWN FAILURE' },
        { id: 'stop', label: 'CORRECT BEFORE LOOKING FARTHER', explanation: 'Remote route changes cannot repair an unreachable local gateway.' },
      ], result: 'Troubleshooting stops at the first demonstrated dependency failure instead of guessing at a remote cause.' },
      takeaway: 'Troubleshoot in dependency order and fix the nearest failed checkpoint first.',
      checkpoint: { prompt: 'A PC has no Ethernet link indication. What should be checked first?', correctChoiceId: 'link', choices: [
        { id: 'link', label: 'LOCAL PORT, CABLE, AND INTERFACE', feedback: 'Correct. Higher-layer tests depend on a working local link.' },
        { id: 'remote', label: 'REMOTE STATIC ROUTE', feedback: 'A remote route cannot compensate for a failed local physical link.' },
        { id: 'app', label: 'APPLICATION PASSWORD', feedback: 'Authentication is above the failed link dependency.' },
      ] },
    },
  ],
  questions: [
    { lessonId: 'icmp-role', prompt: 'What is ICMP used for here?', answers: ['IP control information and diagnostics', 'Assigning VLAN access ports', 'Encrypting application data'], correctAnswerIndex: 0, explanation: 'ICMP supports IP reporting and diagnostics.' },
    { lessonId: 'echo-request-reply', prompt: 'What completes a successful Echo round trip?', answers: ['A Request reaches the destination and a Reply returns', 'A Request leaves the source only', 'A switch learns one MAC'], correctAnswerIndex: 0, explanation: 'Both forward and return delivery are required.' },
    { lessonId: 'ping-outcomes', prompt: 'What does a timeout directly report?', answers: ['The expected reply was not received in time', 'The cable is definitely broken', 'Every application is blocked'], correctAnswerIndex: 0, explanation: 'Timeout is an observation, not a one-cause diagnosis.' },
    { lessonId: 'ping-success-boundary', prompt: 'A ping reply returns. What does it support?', answers: ['Round-trip IP reachability for that test', 'Every TCP port is open', 'The path will always work'], correctAnswerIndex: 0, explanation: 'Echo success has a limited reachability meaning.' },
    { lessonId: 'ping-failure-boundary', prompt: 'Ping fails but a website works. What is plausible?', answers: ['ICMP Echo is filtered', 'IPv4 is impossible', 'The site has no route'], correctAnswerIndex: 0, explanation: 'Policies can treat ICMP and application traffic differently.' },
    { lessonId: 'checkpoint-troubleshooting', prompt: 'No link indicator is present. What comes first?', answers: ['Check local media and interfaces', 'Add a remote route', 'Change DNS'], correctAnswerIndex: 0, explanation: 'Start with the earliest failed dependency.' },
    { lessonId: 'checkpoint-troubleshooting', prompt: 'Local communication works but the configured remote gateway is off-subnet. What should change?', answers: ['The gateway configuration', 'The local switch MAC table first', 'The application name'], correctAnswerIndex: 0, explanation: 'Remote delivery requires a locally reachable gateway.' },
  ],
  cards: [
    ['ICMP', 'An Internet-layer control and reporting protocol.', 'Echo supports ping.'], ['Echo Request', 'An ICMP message asking a destination to reply.', 'The outbound half of ping.'],
    ['Echo Reply', 'The response to an accepted Echo Request.', 'Evidence of a completed round trip.'], ['Ping', 'A tool commonly testing IPv4 reachability with Echo.', 'Ping the gateway.'],
    ['Round Trip', 'Delivery to a destination and back.', 'Request out, reply back.'], ['Timeout', 'The expected response was not observed in time.', 'A symptom requiring more checks.'],
    ['Checkpoint', 'One verified dependency along a path.', 'Check link before gateway.'], ['Filtering', 'Policy that permits or blocks selected traffic.', 'ICMP may be blocked while web traffic works.'],
  ],
  lab: ['ping-diagnostic-desk', 'Diagnose the ping path', 'Check link, addressing, gateway, and end-to-end evidence'],
  recap: ['A checkpoint-based diagnosis', 'ICMP Echo, result boundaries, and troubleshooting order', 'How routers select connected, static, specific, and default routes'],
});
