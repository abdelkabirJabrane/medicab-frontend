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

                        # ✅ FIX : Supprimer le dossier s'il existe déjà
                        rm -rf gitops-repo

                        # Clone the GitOps repository
                        git clone https://\${GIT_USER}:\${GIT_PASS}@github.com/abdelkabirJabrane/Gestion_Cabinent_Medical_PFE.git gitops-repo
                        cd gitops-repo

                        # Update the image tag in deployment.yml
                        sed -i 's|image: ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:.*|image: ${env.DOCKER_REGISTRY}/${env.SERVICE_NAME}:${env.BUILD_NUMBER}|g' k8s/${env.SERVICE_NAME}/deployment.yml

                        # Commit and push
                        git add k8s/${env.SERVICE_NAME}/deployment.yml
                        git commit -m "chore(gitops): update ${env.SERVICE_NAME} image to build ${env.BUILD_NUMBER} [skip ci]" || echo "Aucune modification a commiter"
                        git push origin HEAD:master
                    """
                }
            }
        }
    }
}
