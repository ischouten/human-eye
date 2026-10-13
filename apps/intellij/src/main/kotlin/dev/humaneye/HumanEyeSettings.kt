package dev.humaneye

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.*

@Service(Service.Level.APP)
@State(name = "HumanEye", storages = [Storage("human-eye.xml")])
class HumanEyeSettings : PersistentStateComponent<HumanEyeSettings.Options> {
    data class Options(var enabled: Boolean = true, var visibility: String = "hidden", var visibleTypes: MutableList<String> = mutableListOf())
    private var options = Options()
    override fun getState() = options
    override fun loadState(state: Options) { options = state }
    fun visible(type: String) = !options.enabled || options.visibility == "all" || (options.visibility == "custom" && type in options.visibleTypes)
    companion object { fun get() = ApplicationManager.getApplication().getService(HumanEyeSettings::class.java) }
}
