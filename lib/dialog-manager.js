"use strict";

const STAGES = Object.freeze({
    START: "START",
    NAME: "NAME",
    BUSINESS: "BUSINESS",
    DISCOVERY: "DISCOVERY",
    SOLUTION: "SOLUTION",
    EXAMPLE: "EXAMPLE",
    BUY_INTENT: "BUY_INTENT",
    CONTACT: "CONTACT",
    TASK: "TASK",
    LEAD_CREATED: "LEAD_CREATED"
});

const ACTIONS = Object.freeze({
    REFUSE_ROLE: "REFUSE_ROLE",
    REFUSE_PROMPT: "REFUSE_PROMPT",
    REFUSE_PRIVACY: "REFUSE_PRIVACY",
    GREET: "GREET",
    ACK_NAME: "ACK_NAME",
    SHOW_EXAMPLE: "SHOW_EXAMPLE",
    SHOW_SOLUTION: "SHOW_SOLUTION",
    SHOW_BUSINESS_RECOMMENDATION: "SHOW_BUSINESS_RECOMMENDATION",
    ASK_BUSINESS: "ASK_BUSINESS",
    ASK_SOLUTION_BUSINESS: "ASK_SOLUTION_BUSINESS",
    ASK_CONTACT: "ASK_CONTACT",
    ASK_TASK: "ASK_TASK",
    CREATE_LEAD: "CREATE_LEAD",
    ANSWER_INFORMATION: "ANSWER_INFORMATION",
    ANSWER_PRICE: "ANSWER_PRICE",
    CLARIFY: "CLARIFY",
    OFF_TOPIC: "OFF_TOPIC",
    RAG_RESPONSE: "RAG_RESPONSE"
});

const TRANSITIONS = Object.freeze({
    [ACTIONS.GREET]: { stage: STAGES.NAME, expects: "name", intent: "GREETING" },
    [ACTIONS.ACK_NAME]: { stage: STAGES.DISCOVERY, expects: "none", intent: "NAME" },
    [ACTIONS.SHOW_EXAMPLE]: { stage: STAGES.EXAMPLE, expects: "none", intent: "SHOW_EXAMPLE" },
    [ACTIONS.SHOW_SOLUTION]: { stage: STAGES.SOLUTION, expects: "solution_details", intent: "SOLUTION_REQUEST" },
    [ACTIONS.SHOW_BUSINESS_RECOMMENDATION]: { stage: STAGES.SOLUTION, expects: "solution_details", intent: "BUSINESS_CONTEXT" },
    [ACTIONS.ASK_BUSINESS]: { stage: STAGES.BUSINESS, expects: "business_context", intent: "COMMERCIAL" },
    [ACTIONS.ASK_SOLUTION_BUSINESS]: { stage: STAGES.BUSINESS, expects: "business_context", intent: "SOLUTION_REQUEST" },
    [ACTIONS.ASK_CONTACT]: { stage: STAGES.CONTACT, expects: "contact", intent: "BUY_NOW" },
    [ACTIONS.ASK_TASK]: { stage: STAGES.TASK, expects: "task", intent: "BUY_NOW" },
    [ACTIONS.CREATE_LEAD]: { stage: STAGES.LEAD_CREATED, expects: "none", intent: "LEAD_CREATED" },
    [ACTIONS.ANSWER_INFORMATION]: { stage: STAGES.DISCOVERY, expects: "example_confirmation", intent: "INFORMATIONAL" },
    [ACTIONS.ANSWER_PRICE]: { stage: STAGES.DISCOVERY, expects: "business_context", intent: "COMMERCIAL" },
    [ACTIONS.CLARIFY]: { stage: STAGES.DISCOVERY, expects: "none", intent: "CLARIFICATION" },
    [ACTIONS.OFF_TOPIC]: { stage: STAGES.DISCOVERY, expects: "none", intent: "OFF_TOPIC" },
    [ACTIONS.RAG_RESPONSE]: { stage: STAGES.DISCOVERY, expects: "none", intent: "GENERAL" }
});

const PUBLIC_EXPECTATIONS = Object.freeze({
    NAME_CONTEXT: "name",
    BUSINESS_CONTEXT: "business_context",
    SOLUTION_DETAILS: "solution_details",
    EXAMPLE_CONFIRMATION: "example_confirmation",
    CONTACT_CONTEXT: "contact",
    TASK_CONTEXT: "task"
});

function createDialogManager(detectors) {
    const required = [
        "detectRoleOverride", "detectPromptInjection", "detectPrivacyRequest",
        "detectExampleRequest", "detectExampleConfirmation", "expectsExampleFromHistory",
        "detectCloseOrderIntent", "detectSolutionRequest", "detectRequestedServices",
        "detectLeadContact", "detectBusinessContext", "classifyBusinessDomain",
        "classifyBusinessQuestion", "detectCommercialIntent", "detectOffTopic"
    ];
    for (const name of required) {
        if (typeof detectors[name] !== "function") throw new TypeError(`Dialog Manager detector missing: ${name}`);
    }

    function analyzeMessage({ message, history = [], lang = "uk", state = {}, clientIntent = "" }) {
        const commercialIntent = detectors.detectCommercialIntent(message);
        const questionType = detectors.classifyBusinessQuestion(message);
        const domain = detectors.classifyBusinessDomain(message) || "UNKNOWN_BUSINESS";
        const expectedContext = state.expects || "";
        const exampleContinuation = detectors.expectsExampleFromHistory(history)
            && detectors.detectExampleConfirmation(message);
        const businessContext = expectedContext === "BUSINESS_CONTEXT"
            || detectors.detectBusinessContext(message)
            || questionType === "BUSINESS_CONTEXT";
        const solutionRequest = clientIntent === "SOLUTION_REQUEST"
            || detectors.detectSolutionRequest(message);
        const closeOrder = clientIntent === "BUY_NOW"
            || clientIntent === "CLOSE_ORDER"
            || detectors.detectCloseOrderIntent(message);

        let confidence = 0.55;
        if (closeOrder || solutionRequest || businessContext || commercialIntent) confidence = 0.9;
        if (questionType === "INFORMATIONAL" || questionType === "CLARIFICATION") confidence = 0.85;

        return {
            message,
            lang,
            intent: closeOrder ? "BUY_NOW" : solutionRequest ? "SOLUTION_REQUEST" : questionType,
            stage: state.stage || STAGES.START,
            nextExpects: expectedContext,
            businessDomain: domain,
            businessDescription: businessContext ? message : (state.businessDescription || ""),
            requestedServices: detectors.detectRequestedServices(message),
            buyingIntent: closeOrder,
            commercialIntent,
            confidence,
            contact: detectors.detectLeadContact(message),
            guards: {
                role: detectors.detectRoleOverride(message),
                prompt: detectors.detectPromptInjection(message),
                privacy: detectors.detectPrivacyRequest(message)
            },
            signals: {
                greeting: clientIntent === "GREETING",
                example: clientIntent === "SHOW_EXAMPLE" || detectors.detectExampleRequest(message) || exampleContinuation,
                solutionRequest,
                businessContext,
                informational: questionType === "INFORMATIONAL",
                clarification: questionType === "CLARIFICATION",
                offTopic: detectors.detectOffTopic(message),
                nameIntroduced: Boolean(state.nameIntroduced)
            }
        };
    }

    function decide(analysis, state = {}) {
        const priorityRules = [
            [analysis.guards.role, ACTIONS.REFUSE_ROLE],
            [analysis.guards.prompt, ACTIONS.REFUSE_PROMPT],
            [analysis.guards.privacy, ACTIONS.REFUSE_PRIVACY],
            [state.expects === "CONTACT_CONTEXT", analysis.contact ? ACTIONS.ASK_TASK : ACTIONS.ASK_CONTACT],
            [state.expects === "TASK_CONTEXT", state.contact ? ACTIONS.CREATE_LEAD : ACTIONS.ASK_CONTACT],
            [analysis.signals.example, ACTIONS.SHOW_EXAMPLE],
            [analysis.buyingIntent, analysis.contact ? ACTIONS.ASK_TASK : ACTIONS.ASK_CONTACT],
            [analysis.commercialIntent === "price", ACTIONS.ANSWER_PRICE],
            [analysis.signals.solutionRequest, analysis.businessDomain === "UNKNOWN_BUSINESS" && (!state.businessDomain || state.businessDomain === "UNKNOWN_BUSINESS")
                ? ACTIONS.ASK_SOLUTION_BUSINESS
                : ACTIONS.SHOW_SOLUTION],
            [analysis.signals.businessContext, ACTIONS.SHOW_BUSINESS_RECOMMENDATION],
            [analysis.signals.greeting, ACTIONS.GREET],
            [analysis.signals.nameIntroduced, ACTIONS.ACK_NAME],
            [analysis.signals.informational, ACTIONS.ANSWER_INFORMATION],
            [Boolean(analysis.commercialIntent), state.businessDomain ? ACTIONS.SHOW_SOLUTION : ACTIONS.ASK_BUSINESS],
            [analysis.signals.clarification, ACTIONS.CLARIFY],
            [analysis.signals.offTopic, ACTIONS.OFF_TOPIC]
        ];
        const action = priorityRules.find(([matches]) => matches)?.[1] || ACTIONS.RAG_RESPONSE;

        const baseTransition = TRANSITIONS[action] || {
            stage: state.stage || STAGES.START,
            expects: PUBLIC_EXPECTATIONS[state.expects] || state.expects || "none",
            intent: analysis.intent || "GENERAL"
        };
        const transition = action === ACTIONS.GREET && state.userName
            ? { stage: STAGES.DISCOVERY, expects: "none", intent: "GREETING" }
            : baseTransition;

        return {
            action,
            stage: transition.stage,
            nextExpects: transition.expects,
            intent: transition.intent
        };
    }

    function process(input) {
        const analysis = analyzeMessage(input);
        const decision = decide(analysis, input.state);
        return { analysis, decision };
    }

    return { analyzeMessage, decide, process };
}

module.exports = { ACTIONS, STAGES, TRANSITIONS, createDialogManager };
