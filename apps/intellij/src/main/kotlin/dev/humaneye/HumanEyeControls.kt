package dev.humaneye

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.*
import java.awt.BorderLayout
import java.awt.GridLayout
import javax.swing.*

class HumanEyeConfigurable : Configurable {
    private val enabled = JCheckBox("Enable HumanEye")
    private val visibility = JComboBox(arrayOf("hidden", "all", "custom"))
    private val types = JTextField()
    override fun getDisplayName() = "HumanEye"
    override fun createComponent(): JComponent = JPanel(GridLayout(0, 1, 0, 8)).apply {
        add(enabled); add(JLabel("Visible annotations")); add(visibility)
        add(JLabel("Types to show in custom mode (comma-separated)")); add(types)
        reset()
    }
    private fun selectedTypes() = types.text.split(',').map { it.trim().lowercase() }.filter { it.isNotEmpty() }.distinct().sorted()
    override fun isModified(): Boolean {
        val state = HumanEyeSettings.get().state
        return enabled.isSelected != state.enabled || visibility.selectedItem != state.visibility || selectedTypes() != state.visibleTypes.sorted()
    }
    override fun apply() {
        val state = HumanEyeSettings.get().state
        state.enabled = enabled.isSelected
        state.visibility = visibility.selectedItem as String
        state.visibleTypes = selectedTypes().toMutableList()
        HumanEyeEditors.get().refreshAll()
    }
    override fun reset() {
        val state = HumanEyeSettings.get().state
        enabled.isSelected = state.enabled
        visibility.selectedItem = state.visibility
        types.text = state.visibleTypes.joinToString(", ")
    }
}

class HumanEyeFilterAction : AnAction(), com.intellij.openapi.project.DumbAware {
    override fun actionPerformed(event: AnActionEvent) { event.project?.let(::showFilter) }
    override fun getActionUpdateThread() = ActionUpdateThread.BGT
    companion object {
        fun showFilter(project: Project) {
            val editor = FileEditorManager.getInstance(project).selectedTextEditor
            val settings = HumanEyeSettings.get()
            val available = (editor?.let { AnnotationParser.parse(it.document.text).map(Annotation::type) } ?: emptyList()).distinct().sorted()
            val choices = available.associateWith { JCheckBox(it, settings.visible(it)) }
            val panel = JPanel(BorderLayout(0, 10)).apply {
                add(JLabel("Select annotation types to show. Clear all to fold everything."), BorderLayout.NORTH)
                add(JPanel(GridLayout(0, 1)).apply { choices.values.forEach(::add) }, BorderLayout.CENTER)
            }
            if (JOptionPane.showConfirmDialog(null, panel, "HumanEye annotation filter", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE) != JOptionPane.OK_OPTION) return
            val selected = choices.filterValues { it.isSelected }.keys.toMutableList()
            settings.state.visibility = when { selected.isEmpty() -> "hidden"; selected.size == available.size -> "all"; else -> "custom" }
            settings.state.visibleTypes = selected
            settings.state.enabled = true
            HumanEyeEditors.get().refreshAll()
        }
    }
}

class HumanEyeWidgetFactory : StatusBarWidgetFactory {
    override fun getId() = "HumanEye"
    override fun getDisplayName() = "HumanEye annotation filter"
    override fun createWidget(project: Project): StatusBarWidget = HumanEyeWidget(project)
}
