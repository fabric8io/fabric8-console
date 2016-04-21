/*
 * Copyright 2005-2015 Red Hat, Inc.
 *
 * Red Hat licenses this file to you under the Apache License, version
 * 2.0 (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied.  See the License for the specific language governing
 * permissions and limitations under the License.
 */

package io.fabric8.apps.console;

import io.fabric8.kubernetes.api.model.KubernetesListBuilder;
import io.fabric8.kubernetes.api.model.PodSpecBuilder;
import io.fabric8.kubernetes.generator.annotation.KubernetesModelProcessor;

import java.util.Arrays;

@KubernetesModelProcessor
public class ConsoleModelProcessor {
    int jenkinshiftPort = 9191;

    public void onList(KubernetesListBuilder builder) {
        builder.addNewServiceAccountItem()
                .withNewMetadata().withName("fabric8").endMetadata()
                .endServiceAccountItem()
                .build();

      builder.addNewServiceItem()
              .withNewMetadata()
              .withName("jenkinshift")
              .addToLabels("group", "io.fabric8.apps")
              .addToLabels("project", "console")
              .addToLabels("provider", "fabric8")
              .endMetadata()
              .withNewSpec()
              .withType("LoadBalancer")
              .addNewPort()
              .withName("http")
              .withProtocol("TCP")
              .withPort(80)
              .withNewTargetPort(jenkinshiftPort)
              .endPort()
              .addToSelector("group", "io.fabric8.apps")
              .addToSelector("project", "console")
              .addToSelector("provider", "fabric8")
              .endSpec()
              .endServiceItem()
              .build();
    }

    public void onPodTemplateSpec(PodSpecBuilder builder) {
      String jenkinshiftVersion = System.getProperty("jenkinshift.version", "latest");

      builder.addNewContainer()
              .withName("jenkinshift")
              .withImage("fabric8/jenkinshift:" + jenkinshiftVersion)
              .addNewPort()
              .withContainerPort(jenkinshiftPort)
              .withProtocol("TCP")
              .endPort()
              .endContainer()
              .build();
    }

}
