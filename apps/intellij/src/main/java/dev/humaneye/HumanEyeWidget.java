package dev.humaneye;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.util.Consumer;
import java.awt.event.MouseEvent;
import java.util.StringJoiner;

public final class HumanEyeWidget implements StatusBarWidget, StatusBarWidget.TextPresentation {
    private final Project project;

    public HumanEyeWidget(Project project) {
        this.project = project;
    }

    @Override
    public String ID() {
        return "HumanEye";
    }

    @Override
    public WidgetPresentation getPresentation() {
        return this;
    }

    @Override
    public String getText() {
        HumanEyeSettings.Options state = HumanEyeSettings.Companion.get().getState();
        if (!state.getEnabled()) return "HumanEye: off";
        if (!"custom".equals(state.getVisibility())) return "HumanEye: " + state.getVisibility();
        StringJoiner types = new StringJoiner(", ");
        state.getVisibleTypes().forEach(types::add);
        return "HumanEye: " + types;
    }

    @Override
    public float getAlignment() {
        return 0f;
    }

    @Override
    public String getTooltipText() {
        return "Choose which @agent-context annotations remain visible";
    }

    @Override
    public Consumer<MouseEvent> getClickConsumer() {
        return event -> HumanEyeFilterAction.Companion.showFilter(project);
    }
}
