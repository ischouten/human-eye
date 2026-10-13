package dev.humaneye

import java.util.Locale

data class Annotation(val type: String, val text: String, val startLine: Int, val endLine: Int)

object AnnotationParser {
    private val marker = Regex("^\\s*@agent-context(?:[ \\t]+([a-z][\\w-]*))?\\s*$", RegexOption.IGNORE_CASE)
    private fun clean(line: String) = line.replace(Regex("^\\s*(?:/\\*+|<!--|//|#)\\s?"), "")
        .replace(Regex("\\s*(?:\\*/|-->)\\s*$"), "").replace(Regex("^\\s*\\*\\s?"), "")

    fun parse(source: String): List<Annotation> {
        val lines = source.split(Regex("\\r\\n|\\n|\\r"))
        val result = mutableListOf<Annotation>()
        var index = 0
        while (index < lines.size) {
            val trimmed = lines[index].trimStart()
            val quote = listOf("\"\"\"", "'''").firstOrNull { trimmed.startsWith(it) }
            if (quote != null) {
                if (trimmed.drop(quote.length).contains(quote)) { index++; continue }
                var closing = index + 1
                while (closing < lines.size && lines[closing].trim() != quote) closing++
                if (closing == lines.size) break
                val inside = lines.subList(index + 1, closing)
                val markerIndex = inside.indexOfFirst { marker.matches(it) }
                if (markerIndex >= 0) {
                    val match = marker.matchEntire(inside[markerIndex])!!
                    val start = index + markerIndex + 2
                    result.add(Annotation(type(match), inside.drop(markerIndex + 1).joinToString("\n").trim(), start, maxOf(start, closing)))
                }
                index = closing + 1
                continue
            }
            val closing = when { trimmed.startsWith("/*") -> "*/"; trimmed.startsWith("<!--") -> "-->"; else -> null }
            val prefix = when { trimmed.startsWith("//") -> "//"; trimmed.startsWith("#") -> "#"; else -> null }
            var end = index
            if (closing != null) {
                while (end < lines.size && !lines[end].contains(closing)) end++
                if (end == lines.size) break
                if (lines[end].substringAfter(closing).isNotBlank()) { index = end + 1; continue }
            } else if (prefix != null && marker.matches(clean(lines[index]))) {
                while (end + 1 < lines.size && lines[end + 1].trimStart().startsWith(prefix) && !marker.matches(clean(lines[end + 1]))) end++
            } else { index++; continue }
            val text = lines.subList(index, end + 1).map(::clean).toMutableList()
            val markerIndex = text.indexOfFirst { marker.matches(it) }
            if (markerIndex >= 0) {
                val match = marker.matchEntire(text[markerIndex])!!
                text[markerIndex] = ""
                result.add(Annotation(type(match), text.joinToString("\n").trim(), index + 1, end + 1))
            }
            index = end + 1
        }
        return result
    }

    private fun type(match: MatchResult) = match.groupValues[1].ifEmpty { "untyped" }.lowercase(Locale.ROOT)
}
