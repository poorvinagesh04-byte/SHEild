package com.sheild.service;

import com.sheild.domain.SupportAction;
import com.sheild.domain.SupportFeeling;
import com.sheild.dto.SupportRequest;
import com.sheild.dto.SupportResponse;
import com.sheild.dto.SupportResponse.SupportOption;
import com.sheild.entity.SafetyCase;
import com.sheild.entity.SupportInteraction;
import com.sheild.entity.UserEntity;
import com.sheild.repository.SupportInteractionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class SupportService {

    private final SupportInteractionRepository supportRepository;
    private final AccessService accessService;

    public SupportService(SupportInteractionRepository supportRepository, AccessService accessService) {
        this.supportRepository = supportRepository;
        this.accessService = accessService;
    }

    @Transactional
    public SupportResponse respond(SupportRequest request, UserEntity user) {
        SupportFeeling feeling = request.feeling();
        SupportAction action = request.action() == null ? SupportAction.OPENING : request.action();

        String message;
        String exerciseTitle = null;
        List<String> exerciseSteps = List.of();
        List<SupportOption> options = new ArrayList<>();
        List<SupportResponse.SupportResource> resources = resources();

        if (action == SupportAction.GROUNDING) {
            message = "Let's slow this moment down together. You do not have to solve anything in the next few minutes. "
                    + "If you can, place both feet on the floor and let your shoulders drop.";
            exerciseTitle = "A gentle 60-second grounding pause";
            exerciseSteps = List.of(
                    "Breathe in for four counts, and out for six. Repeat three times.",
                    "Name five things you can see around you, without judging them.",
                    "Notice three sounds, near or far.",
                    "Press your feet into the floor and unclench your hands.",
                    "When you are ready, ask yourself: what is one small thing I need in the next hour?"
            );
        } else if (action == SupportAction.TRUSTED_PERSON) {
            message = "Reaching out can be hard, especially if you are used to carrying things alone. "
                    + "You do not need to share everything at once. You can choose one person and one sentence.";
            exerciseTitle = "A short message you could adapt";
            exerciseSteps = List.of(
                    "Choose someone who has been steady and kind before.",
                    "Try: “Something online has been happening and I’m not okay. Can you stay with me while I decide what to do next?”",
                    "You can add: “I don’t need you to fix it. I just need you to listen.”",
                    "If calling feels like too much, send a text or voice note instead.",
                    "Decide together what, if anything, you want to do next."
            );
        } else if (action == SupportAction.RESOURCES) {
            message = "Here are official and support resources you can use when you choose. "
                    + "SHEild does not contact them for you, and using them is entirely your decision. "
                    + "If you are in immediate danger, call 112.";
        } else if (action == SupportAction.LISTEN) {
            message = "I’m here, and I’m not going anywhere in this moment. You do not have to explain it perfectly. "
                    + "What happened is not your fault, and you are allowed to feel however you feel. "
                    + "There is no right next step except the one that feels safe to you.";
        } else if (action == SupportAction.RETURN_TO_CASE) {
            message = "Your case is still there whenever you want it. Closing this screen does not erase anything you have saved. "
                    + "You can come back to support at any time.";
        } else {
            message = openingFor(feeling);
        }

        options.add(new SupportOption("grounding", "Try a grounding exercise", "GROUNDING"));
        options.add(new SupportOption("trusted", "Plan a message to someone I trust", "TRUSTED_PERSON"));
        options.add(new SupportOption("resources", "Show support resources", "RESOURCES"));
        options.add(new SupportOption("listen", "Just stay with me for a moment", "LISTEN"));
        options.add(new SupportOption("case", "Return to my case", "RETURN_TO_CASE"));

        boolean metadataStored = false;
        String metadataNote = "This interaction was not saved. SHEild does not store what you choose to share here.";
        if (request.associateWithCase() && request.caseId() != null) {
            SafetyCase safetyCase = accessService.requireCase(request.caseId(), user);
            supportRepository.save(new SupportInteraction(user, safetyCase, feeling, action, true));
            metadataStored = true;
            metadataNote = "Only the feeling you selected, the type of support step, and the time were attached to your case. Your words were not stored.";
        }

        return new SupportResponse(message, "GUIDED_RULE_BASED", "Guided support — not AI or a counsellor",
                exerciseTitle, exerciseSteps, options, resources, metadataStored, metadataNote);
    }

    private String openingFor(SupportFeeling feeling) {
        return switch (feeling) {
            case SCARED -> "Feeling scared makes sense. Your body may be trying to protect you, and you do not have to talk yourself out of it. "
                    + "You are safe to take this one moment at a time. Nothing here has to be reported or decided right now.";
            case OVERWHELMED -> "When everything arrives at once, it can be hard to think. You do not have to sort all of it today. "
                    + "We can start with one breath, one small choice, or just staying here for a moment.";
            case ANGRY -> "Anger can be a completely reasonable response to being violated or dismissed. You are allowed to be angry. "
                    + "You do not have to act on it immediately, and you do not have to perform calm for anyone.";
            case CONFUSED -> "Not knowing what to do, or even what happened, is a valid place to be. You do not need certainty before you deserve support. "
                    + "We can look at one piece at a time, and you can stop whenever you want.";
            case UNSURE -> "You do not have to name the feeling precisely. “I don’t know” is a real answer. "
                    + "We can stay with the uncertainty for a moment, and you can choose a small step only if it feels useful.";
            case LISTEN -> "I’m here. You do not have to explain, justify, or decide anything. "
                    + "What happened is not your fault, and you are allowed to feel however you feel right now.";
        };
    }

    private List<SupportResponse.SupportResource> resources() {
        return List.of(
                new SupportResponse.SupportResource("Emergency response — India",
                        "If you or someone else is in immediate danger, call 112.",
                        null, "112"),
                new SupportResponse.SupportResource("Women's Helpline — India",
                        "A national helpline for women in distress. Available 24×7.",
                        null, "181"),
                new SupportResponse.SupportResource("National Cyber Crime Reporting Portal",
                        "The official Government of India portal for reporting cyber crime. You choose whether to use it.",
                        "https://www.cybercrime.gov.in/", null),
                new SupportResponse.SupportResource("Instagram Help Centre",
                        "Reporting tools and safety guidance from Instagram.",
                        "https://help.instagram.com/", null),
                new SupportResponse.SupportResource("Facebook Safety Centre",
                        "Tools for reporting, blocking, and controlling who can contact you.",
                        "https://www.facebook.com/safety", null),
                new SupportResponse.SupportResource("WhatsApp Safety",
                        "Guidance on blocking, reporting, and privacy settings.",
                        "https://www.whatsapp.com/safety", null)
        );
    }
}
