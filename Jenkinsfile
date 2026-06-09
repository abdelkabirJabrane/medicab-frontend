pipeline {
    agent any
    environment {
        SERVICE_NAME = "medicab-frontend"
        DOCKER_REGISTRY = "abdojab"
    }
    stages {
        stage('Build') {
            steps {
                echo 'Building frontend via Docker multi-stage build...'
            }
        }

        stage('Docker Build & Push') {
            steps {
                sh "docker build -t ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:${env.BUILD_NUMBER} ."
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh "echo \${DOCKER_PASS} | docker login -u \${DOCKER_USER} --password-stdin"
                    sh "docker push ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:${env.BUILD_NUMBER}"
                }
            }
        }

        stage('GitOps Update Manifest') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-creds', passwordVariable: 'GIT_PASS', usernameVariable: 'GIT_USER')]) {
                    sh """
                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@medicab.local"
                        rm -rf gitops-repo
                        git clone https://\${GIT_USER}:\${GIT_PASS}@github.com/abdelkabirJabrane/Gestion_Cabinent_Medical_PFE.git gitops-repo
                        cd gitops-repo
                        sed -i 's|image: ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:.*|image: ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:${env.BUILD_NUMBER}|g' k8s/${env.SERVICE_NAME}/deployment.yml
                        git add k8s/${env.SERVICE_NAME}/deployment.yml
                        git commit -m "chore(gitops): update ${env.SERVICE_NAME} image to build ${env.BUILD_NUMBER} [skip ci]" || echo "Aucune modification a commiter"
                        git push origin HEAD:master
                    """
                }
            }
        }

        // ✅ NOUVEAU STAGE — Créer le secret + Déployer
        stage('Deploy to K8s') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh """
                        # Créer ou mettre à jour le secret regcred
                        kubectl create secret docker-registry regcred \
                          --docker-server=https://index.docker.io/v1/ \
                          --docker-username=\${DOCKER_USER} \
                          --docker-password=\${DOCKER_PASS} \
                          --docker-email=abdelkabir.jabrane20@gmail.com \
                          -n medicab --dry-run=client -o yaml | kubectl apply -f -

                        # Appliquer le deployment depuis le repo cloné
                        kubectl apply -f gitops-repo/k8s/${env.SERVICE_NAME}/deployment.yml

                        # Forcer le redémarrage pour prendre la nouvelle image
                        kubectl rollout restart deployment/${env.SERVICE_NAME} -n medicab

                        # Attendre que le déploiement soit prêt
                        kubectl rollout status deployment/${env.SERVICE_NAME} -n medicab --timeout=120s
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ ${env.SERVICE_NAME} déployé avec succès — build ${env.BUILD_NUMBER}"
        }
        failure {
            echo "❌ Échec du pipeline — vérifier les logs"
        }
    }
}
