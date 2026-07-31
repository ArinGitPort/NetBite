import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterTen = createAdvancedChapter({
  id: 10, flashcardVersion: 3, title: 'VLANs', summary: 'Separate Layer 2 broadcast domains and carry selected VLANs between switches.',
  lessons: [
    {
      id: 'vlan-purpose', title: 'VLANs create logical local networks', illustration: 'vlan-purpose',
      body: 'A virtual LAN groups switch ports into a logical Layer 2 network. Devices can share physical switch hardware while belonging to different LANs, which gives administrators flexible boundaries without separate switches for every group.',
      sections: [
        { heading: 'Logical does not mean imaginary', body: 'The separation changes real forwarding behavior. Frames in one VLAN are not automatically delivered into another VLAN.' },
        { heading: 'Membership must be configured', body: 'A VLAN number is a switch configuration identifier. Simply giving PCs similar names or IPv4 addresses does not place their ports in the same VLAN.' },
      ],
      example: { label: 'ONE SWITCH / TWO GROUPS', setup: 'Ports 1–4 belong to VLAN 10; ports 5–8 belong to VLAN 20.', result: 'The switch treats the two groups as separate logical Layer 2 networks.' },
      takeaway: 'A VLAN creates a configured logical LAN on switching infrastructure.',
    },
    {
      id: 'logical-vlan-separation', title: 'Each VLAN is a broadcast domain', illustration: 'vlan-segments',
      body: 'A Layer 2 broadcast is flooded only within its VLAN. VLAN 10 and VLAN 20 therefore form separate broadcast domains even when their access ports exist on the same physical switch.',
      sections: [
        { heading: 'Flooding respects membership', body: 'Unknown unicast and broadcast flooding use eligible ports in the same VLAN and still exclude the ingress port.' },
        { heading: 'Separation has a routing boundary', body: 'Traffic that must cross between VLANs needs a Layer 3 device with interfaces or logical interfaces for those networks.' },
      ],
      example: { label: 'BROADCAST TEST', setup: 'A PC in VLAN 10 sends an Ethernet broadcast.', result: 'VLAN 10 ports may receive it; VLAN 20 access ports do not.' },
      takeaway: 'VLAN membership limits a Layer 2 broadcast to one logical broadcast domain.',
    },
    {
      id: 'access-ports', title: 'An access port joins one endpoint VLAN', illustration: 'access-port',
      body: 'An access port connects an endpoint to one configured VLAN. Frames arriving from the endpoint are associated with that access VLAN as the switch learns sources and makes forwarding decisions.',
      sections: [
        { heading: 'Endpoint view', body: 'Ordinary endpoint traffic on an access link is normally untagged. The switch’s port configuration supplies the VLAN association.' },
        { heading: 'Port assignment matters', body: 'Moving the cable to an access port in another VLAN changes the endpoint’s Layer 2 membership, even if its old IPv4 configuration remains unchanged and becomes unsuitable.' },
      ],
      example: { label: 'PC A MEMBERSHIP', setup: 'PC A connects to switch port 1 configured as access VLAN 10.', result: 'PC A’s arriving Ethernet frames are processed as VLAN 10 traffic.' },
      takeaway: 'An endpoint access port associates untagged endpoint traffic with one configured VLAN.',
      checkpoint: { prompt: 'A PC should join VLAN 20. What must be true of its switch access port?', correctChoiceId: 'assigned', choices: [
        { id: 'assigned', label: 'ASSIGNED TO VLAN 20', feedback: 'Correct. Access-port configuration provides the endpoint’s VLAN membership.' },
        { id: 'named', label: 'NAMED “VLAN 20” ON THE PC', feedback: 'A device name does not configure switch-port membership.' },
        { id: 'trunk', label: 'CARRY EVERY VLAN', feedback: 'An ordinary endpoint access port is assigned to one endpoint VLAN.' },
      ] },
    },
    {
      id: 'same-vlan-switching', title: 'Same-VLAN traffic can stay at Layer 2', illustration: 'same-vlan',
      body: 'Endpoints in the same VLAN share a Layer 2 broadcast domain. When addressing and physical paths are valid, switches can learn their MAC addresses and forward frames between their VLAN member ports.',
      sections: [
        { heading: 'Across more than one switch', body: 'Same-VLAN communication can extend across switches when a valid inter-switch path carries that VLAN.' },
        { heading: 'Same VLAN is not the only requirement', body: 'The ports, links, host addressing, and any trunk allowance must also be correct. VLAN membership does not repair a disconnected cable.' },
      ],
      example: { label: 'LOCAL LAYER 2 PATH', setup: 'PC A and PC B both use VLAN 10 on one switch.', result: 'The switch can forward their unicast frames within VLAN 10 without routing between VLANs.' },
      takeaway: 'Same-VLAN endpoints can use a Layer 2 switching path when the complete VLAN path is valid.',
    },
    {
      id: 'same-different-vlan', title: 'Different VLANs require Layer 3 forwarding', illustration: 'vlan-reachability',
      body: 'Endpoints in different VLANs belong to different Layer 2 broadcast domains. A Layer 2 switch does not merge the domains merely because both endpoints connect to it.',
      sections: [
        { heading: 'Routing is the crossing point', body: 'Communication between VLAN networks requires a router or Layer 3 switch with suitable interfaces, gateways, and routes.' },
        { heading: 'This chapter stops at the boundary', body: 'NetBite identifies when routing is required but does not configure router-on-a-stick or switched virtual interfaces in this chapter.' },
      ],
      example: { label: 'VLAN 10 TO VLAN 20', setup: 'PC A is in VLAN 10; PC B is in VLAN 20.', result: 'They need Layer 3 inter-VLAN forwarding rather than a direct same-domain switch path.' },
      takeaway: 'Different VLANs remain separated until a Layer 3 device routes between their networks.',
    },
    {
      id: 'dot1q-tag', title: 'An 802.1Q tag identifies VLAN traffic', illustration: 'dot1q-tag',
      body: 'On a link carrying traffic for multiple VLANs, IEEE 802.1Q information identifies which VLAN a frame belongs to. The tag lets the receiving switch preserve separation while sharing one physical inter-switch link.',
      sections: [
        { heading: 'The tag is not a new LAN merge', body: 'VLAN 10 and VLAN 20 frames can traverse the same cable while remaining members of different logical broadcast domains.' },
        { heading: 'Access and trunk views differ', body: 'Endpoint access traffic is normally associated through the access-port configuration. The tagged shared-link view is used where multiple VLAN identities need to cross.' },
      ],
      example: { label: 'SHARED CABLE', setup: 'One inter-switch link carries VLAN 10 and VLAN 20.', result: '802.1Q identification lets the far switch place each frame back into the correct VLAN context.' },
      takeaway: '802.1Q identifies VLAN membership on a shared link without combining the VLANs.',
    },
    {
      id: 'dot1q-trunks', title: 'A trunk carries allowed VLANs between switches', illustration: 'vlan-trunk',
      body: 'A trunk is configured to carry traffic for multiple VLANs between network devices. Both ends must form a consistent trunk path, and each required VLAN must be permitted across it.',
      sections: [
        { heading: 'Allowed list controls the path', body: 'If VLAN 20 is omitted from the allowed VLAN set, VLAN 20 can work locally on each switch yet fail to cross that trunk.' },
        { heading: 'End-to-end VLAN path', body: 'Check the source access port, every trunk along the path, and the destination access port. One mismatched segment breaks that VLAN’s Layer 2 continuity.' },
      ],
      example: { label: 'TWO-SWITCH VLAN 20', setup: 'PC A and PC B use VLAN 20 access ports on different switches, but the inter-switch trunk allows only VLAN 10.', steps: [
        { id: 'ingress', label: 'CLASSIFY THE INGRESS', explanation: 'PC A’s access port associates the arriving frame with VLAN 20.' },
        { id: 'path', label: 'CHECK THE TRUNK', explanation: 'The only inter-switch path is configured to allow VLAN 10, not VLAN 20.' },
        { id: 'preserve', label: 'PRESERVE SEPARATION', explanation: 'The switches do not silently place VLAN 20 traffic into VLAN 10.' },
        { id: 'correct', label: 'ALLOW THE REQUIRED VLAN', explanation: 'Add VLAN 20 to the allowed trunk set while keeping its identity separate.' },
      ], result: 'VLAN 20 can cross only after every trunk on its path allows VLAN 20.' },
      takeaway: 'A trunk extends only its allowed VLANs across a shared inter-switch link.',
      checkpoint: { prompt: 'VLAN 20 works locally on both switches but not across their trunk. What should be checked?', correctChoiceId: 'allow', choices: [
        { id: 'allow', label: 'VLAN 20 IS ALLOWED ON THE TRUNK', feedback: 'Correct. A VLAN needs an allowed end-to-end trunk path.' },
        { id: 'merge', label: 'VLAN 20 IS MERGED WITH VLAN 10', feedback: 'Trunks preserve VLAN separation rather than merging domains.' },
        { id: 'name', label: 'BOTH SWITCHES HAVE THE SAME NAME', feedback: 'Hostnames do not determine allowed VLAN forwarding.' },
      ] },
    },
  ],
  questions: [
    { lessonId: 'vlan-purpose', prompt: 'What does a VLAN create?', answers: ['A configured logical Layer 2 network', 'A new physical switch automatically', 'A public IPv4 allocation'], correctAnswerIndex: 0, explanation: 'A VLAN forms a logical LAN on switching infrastructure.' },
    { lessonId: 'logical-vlan-separation', prompt: 'A VLAN 10 broadcast enters a switch. Which access domain receives it?', answers: ['VLAN 10 only', 'Every VLAN', 'VLAN 20 only'], correctAnswerIndex: 0, explanation: 'Broadcast flooding remains inside the VLAN.' },
    { lessonId: 'access-ports', prompt: 'A PC connects to an access port assigned to VLAN 20. What membership does it receive?', answers: ['VLAN 20', 'Every VLAN', 'No Layer 2 network'], correctAnswerIndex: 0, explanation: 'The access-port configuration associates endpoint traffic with VLAN 20.' },
    { lessonId: 'same-vlan-switching', prompt: 'Two valid endpoints share VLAN 10. What kind of path can connect them?', answers: ['A Layer 2 switching path in VLAN 10', 'Mandatory inter-VLAN routing', 'A default route only'], correctAnswerIndex: 0, explanation: 'Same-VLAN traffic can be switched.' },
    { lessonId: 'same-different-vlan', prompt: 'What is needed for VLAN 10 to communicate with VLAN 20?', answers: ['Layer 3 routing', 'A larger MAC table only', 'The same access port'], correctAnswerIndex: 0, explanation: 'Different VLAN networks require Layer 3 forwarding.' },
    { lessonId: 'dot1q-tag', prompt: 'Why is 802.1Q information used on a shared VLAN link?', answers: ['To preserve the frame’s VLAN identity', 'To merge every VLAN', 'To replace IPv4 addresses'], correctAnswerIndex: 0, explanation: 'The tag identifies VLAN membership on the shared link.' },
    { lessonId: 'dot1q-trunks', prompt: 'VLAN 20 is missing from a trunk’s allowed set. What fails?', answers: ['VLAN 20 continuity across that trunk', 'Every VLAN everywhere', 'All access-port configuration'], correctAnswerIndex: 0, explanation: 'Only allowed VLANs cross the trunk.' },
    { lessonId: 'dot1q-trunks', prompt: 'What must match for an end-to-end VLAN path?', answers: ['Access membership and every required trunk allowance', 'Only endpoint names', 'Only one switch’s port color'], correctAnswerIndex: 0, explanation: 'Every segment must carry the intended VLAN.' },
  ],
  cards: [
    ['vlan-purpose', 'Why would an administrator place devices into separate VLANs on the same switch hardware?', 'To create separate logical Layer 2 networks and broadcast boundaries without requiring a different physical switch for each group.', 'VLAN membership changes the logical LAN a switchport belongs to.'],
    ['logical-vlan-separation', 'A host in VLAN 10 sends a Layer 2 broadcast. Which ports may receive it?', 'Eligible ports carrying VLAN 10, except the ingress port.', 'Ports belonging only to VLAN 20 are outside that broadcast domain.'],
    ['access-ports', 'What VLAN behavior should an endpoint-facing access port provide?', 'It assigns the attached endpoint’s untagged traffic to one configured VLAN.', 'The endpoint normally sends ordinary untagged Ethernet frames on an access link.'],
    ['same-vlan-switching', 'PC A and PC B are in VLAN 10 on different switches. What Layer 2 path is required?', 'Both access ports must belong to VLAN 10, and every trunk between them must carry VLAN 10.', 'The VLAN must remain continuous across every switch segment in the path.'],
    ['same-different-vlan', 'Can a Layer 2 switch alone forward traffic directly from VLAN 10 to VLAN 20?', 'No.', 'Different VLANs are different Layer 2 networks; communication between them requires Layer 3 routing.'],
    ['dot1q-tag', 'What information does an IEEE 802.1Q tag add on a trunk?', 'VLAN identification so shared trunk traffic remains associated with the correct VLAN.', 'The tag preserves logical separation while multiple VLANs use one physical link.'],
    ['dot1q-trunks', 'What is the purpose of a trunk link between switches?', 'To carry traffic for multiple permitted VLANs over one shared connection.', 'A trunk does not merge those VLANs into one broadcast domain.'],
    ['dot1q-trunks', 'VLAN 20 is absent from a trunk’s allowed list. What traffic is affected?', 'VLAN 20 cannot continue across that trunk, while other permitted VLANs may still work.', 'Check the allowed VLAN configuration at both endpoints of the trunk.'],
    ['same-different-vlan', 'Two PCs have addresses in the same IPv4 subnet but their access ports are in different VLANs. Can they communicate directly?', 'No.', 'Their Layer 2 VLAN separation prevents the local Ethernet path even though the IPv4 settings appear similar.'],
  ],
  lab: ['vlan-port-desk', 'Configure VLAN paths', 'Use the NetBite CLI to assign access ports, build a trunk, and verify separation'],
  recap: ['Two separated VLANs across two switches', 'Broadcast boundaries, access membership, tags, routing boundaries, and trunk allowances', 'How layered models organize all previously learned responsibilities'],
});
