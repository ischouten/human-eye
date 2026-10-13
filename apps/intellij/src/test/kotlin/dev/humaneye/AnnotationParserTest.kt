package dev.humaneye

import org.junit.Assert.assertEquals
import org.junit.Test

class AnnotationParserTest {
    @Test fun lineCommentBoundaryAndParagraph() {
        assertEquals(listOf(Annotation("history", "something\n\nstill context", 1, 4)), AnnotationParser.parse("# @agent-context history\n# something\n#\n# still context"))
        assertEquals(listOf(Annotation("history", "something", 1, 2)), AnnotationParser.parse("# @agent-context history\n# something\n\n# normal comment"))
    }
    @Test fun blockAndAdjacentMarkers() {
        assertEquals(listOf(Annotation("invariant", "Keep IDs stable.", 2, 5)), AnnotationParser.parse("const x = 1;\n/**\n * @agent-context invariant\n * Keep IDs stable.\n */"))
        assertEquals(listOf("design", "history"), AnnotationParser.parse("// @agent-context DESIGN\n// One\n// @agent-context history\n// Two").map { it.type })
    }
    @Test fun embeddedDocstringExcludesHumanProse() {
        assertEquals(listOf(Annotation("history", "The failure was real.\nKeep this test.", 5, 7)), AnnotationParser.parse("\"\"\"A human summary.\n\nMore visible prose.\n\n@agent-context history\nThe failure was real.\nKeep this test.\n\"\"\""))
        assertEquals(listOf(Annotation("invariant", "Stable wire name.", 2, 3)), AnnotationParser.parse("'''\n@agent-context invariant\nStable wire name.\n'''"))
    }
    @Test fun rejectsMalformedAndUnsafeBlocks() {
        assertEquals(emptyList<Annotation>(), AnnotationParser.parse("// @agent-context history and prose\n// no"))
        assertEquals(emptyList<Annotation>(), AnnotationParser.parse("/* @agent-context design\n * unfinished"))
        assertEquals(emptyList<Annotation>(), AnnotationParser.parse("/* @agent-context invariant */ run();"))
    }
}
