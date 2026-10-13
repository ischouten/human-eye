package dev.humaneye

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Test
import java.nio.file.Files
import java.nio.file.Path

class SharedFixtureTest {
    data class Fixture(val source: String, val annotations: List<Annotation>)
    @Test fun matchesSharedAnnotationContract() {
        val path = Path.of("../../tests/fixtures/annotations.json")
        val type = object : TypeToken<List<Fixture>>() {}.type
        val fixtures: List<Fixture> = Gson().fromJson(Files.readString(path), type)
        fixtures.forEach { assertEquals(it.annotations, AnnotationParser.parse(it.source)) }
    }
}
