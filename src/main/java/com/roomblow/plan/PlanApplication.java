package com.roomblow.plan;

import org.apache.commons.io.IOUtils;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.thymeleaf.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;

@SpringBootApplication
public class PlanApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlanApplication.class, args);
    }
}

@Controller
@RequestMapping(method = {RequestMethod.POST, RequestMethod.GET})
class PlanApplicationController {
    @RequestMapping("/")
    public String welcome() {
        return "/index";
    }

    @RequestMapping({"/survey/{version}", "/survey"})
    public String survey(@PathVariable(name = "version", required = false) String version) {
        if (StringUtils.isEmptyOrWhitespace(version)) {
            return "redirect:/survey/2.90";
        }
        return "/survey/" + version;
    }

    @RequestMapping(value = "/survey/{version}/diagram", method = RequestMethod.GET, produces = MediaType.IMAGE_PNG_VALUE)
    public @ResponseBody ResponseEntity<InputStreamResource> surveyDiagram(@PathVariable String version) throws IOException {
        InputStream in = getClass().getResourceAsStream("/static/survey/"+version + ".png");
        return ResponseEntity
                .ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(new InputStreamResource(in));
    }

}
